import {
  safeValidateUIMessages,
  type UIMessage,
  type TextUIPart,
  type ReasoningUIPart,
  type ToolUIPart,
  type DataUIPart,
  type StepStartUIPart,
  type UIMessagePart,
  type UIDataTypes,
  type UITools,
  type InferUITools,
  type InferUIMessageChunk,
} from 'ai'

import { createLogger } from '../../utils/logger'
import { generateUUID } from '../../utils/uuid'
import type { ItemService } from '../ItemService'
import type { OutfitService } from '../OutfitService'
import type { MessageRepository } from '../../repositories/MessageRepository'
import type { ConversationRepository } from '../../repositories/ConversationRepository'
import { createAgent } from './agent'
import { getGeneralPrompt, getTravelPrompt } from './prompts'
import { classifyRoute, extractTravelDetails } from './router'
import { loadState, saveState, toModelMessages } from './state'
import { createTools, type ToolSet } from './tools'
import type { TravelContext } from './types'

type AgentTools = InferUITools<ToolSet>
export type AgentUIMessage = UIMessage<unknown, UIDataTypes, AgentTools>

function extractTextFromParts(parts: AgentUIMessage['parts']): string {
  return parts
    .filter((part): part is TextUIPart => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

const logger = createLogger('AgentExecutor')

export interface ExecuteAgentStreamParams {
  messageId: string
  userId: string
  itemService: ItemService
  outfitService: OutfitService
  messageRepository: MessageRepository
  conversationRepository: ConversationRepository
}

export type StreamChunk =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'reasoning-delta'; reasoningDelta: string }
  | { type: 'tool-call'; toolCall: ToolUIPart }
  | { type: 'data-part'; dataPart: DataUIPart<UIDataTypes> }
  | { type: 'step-start'; stepStart: StepStartUIPart }
  | { type: 'metadata'; metadata: { conversationId: string } }
  | { type: 'status'; status: string }

/**
 * Execute agent conversation flow:
 * 1. Load state from database up to messageId
 * 2. Route classification (unsafe/offtopic/travel/general)
 * 3. Handle route-specific logic
 * 4. Save state and return response
 *
 * @param {ExecuteAgentStreamParams} params - Execution parameters
 * @returns {AsyncIterable<StreamChunk>} - Stream of chunks
 */
export async function* executeAgentStream(
  params: ExecuteAgentStreamParams
): AsyncIterable<StreamChunk> {
  const {
    messageId,
    userId,
    itemService,
    outfitService,
    messageRepository,
    conversationRepository,
  } = params

  yield { type: 'status', status: 'Thinking...' }

  const tools = createTools({ userId, itemService, outfitService }) satisfies ToolSet
  const state = await loadState(
    messageRepository,
    conversationRepository,
    messageId,
    tools
  )

  const messages: AgentUIMessage[] = state.messages

  if (!messages.length) {
    throw new Error('No messages found in conversation')
  }

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role !== 'user') {
    throw new Error('Last message must be a user message')
  }

  const messageText = extractTextFromParts(lastMessage.parts)

  const conversationHistory = getClassificationContext(messages.slice(0, -1))

  const routeResult = await classifyRoute(
    messageText.trim(),
    conversationHistory
  )

  logger.info(`✓ ${routeResult.route}: ${routeResult.summary} [conv:${state.conversationId.slice(0, 8)} msg:${messageId.slice(0, 8)}]`)

  await conversationRepository.updateTitle(
    state.conversationId,
    routeResult.summary
  )

  if (routeResult.route === 'unsafe' || routeResult.route === 'offtopic') {
    yield* handleSimpleResponse(
      routeResult.response,
      messages,
      state.conversationId,
      userId,
      state.createdAt,
      messageRepository,
      conversationRepository
    )
    return
  }

  if (routeResult.route === 'travel') {
    yield* handleTravelRoute(
      messageText.trim(),
      messages,
      state.conversationId,
      userId,
      state.createdAt,
      itemService,
      outfitService,
      messageRepository,
      conversationRepository
    )
    return
  }

  yield* handleGeneralRoute(
    messages,
    state.conversationId,
    userId,
    state.createdAt,
    itemService,
    outfitService,
    messageRepository,
    conversationRepository
  )
}

/**
 * Handle simple text response (unsafe/offtopic routes).
 */
async function* handleSimpleResponse(
  response: string,
  messages: AgentUIMessage[],
  conversationId: string,
  userId: string,
  createdAt: Date,
  messageRepository: MessageRepository,
  conversationRepository: ConversationRepository
): AsyncIterable<StreamChunk> {
  const assistantMessage: AgentUIMessage = {
    id: generateUUID(),
    role: 'assistant',
    parts: [{ type: 'text', text: response }],
  } as AgentUIMessage
  messages.push(assistantMessage)

  const savedConversationId = await saveState(
    messageRepository,
    conversationRepository,
    {
      conversationId,
      userId,
      messages,
      lastMessageAt: new Date(),
      createdAt,
    },
  )

  yield { type: 'text-delta', textDelta: response }
  yield { type: 'metadata', metadata: { conversationId: savedConversationId } }
}

/**
 * Handle travel route with clarification and workflow execution.
 */
async function* handleTravelRoute(
  userMessage: string,
  messages: AgentUIMessage[],
  conversationId: string,
  userId: string,
  createdAt: Date,
  itemService: ItemService,
  outfitService: OutfitService,
  messageRepository: MessageRepository,
  conversationRepository: ConversationRepository
): AsyncIterable<StreamChunk> {
  yield { type: 'status', status: 'Planning your travel wardrobe...' }

  const recentUserMessages = getExtractionContext(messages)

  const extractedDetails = await extractTravelDetails(
    userMessage,
    recentUserMessages
  )
  const travelContext: TravelContext = {
    ...extractedDetails,
  }

  const clarification = getClarificationQuestion(travelContext)
  if (clarification) {
    yield* handleSimpleResponse(
      clarification,
      messages,
      conversationId,
      userId,
      createdAt,
      messageRepository,
      conversationRepository
    )
    return
  }

  yield { type: 'status', status: 'Building your travel outfits...' }
  yield* runAgentWorkflow(
    getTravelPrompt({
      city: travelContext.city!,
      startDate: travelContext.startDate!,
      endDate: travelContext.endDate!,
    }),
    messages,
    conversationId,
    userId,
    createdAt,
    itemService,
    outfitService,
    messageRepository,
    conversationRepository,
  )
}

/**
 * Handle general route with agent workflow.
 */
async function* handleGeneralRoute(
  messages: AgentUIMessage[],
  conversationId: string,
  userId: string,
  createdAt: Date,
  itemService: ItemService,
  outfitService: OutfitService,
  messageRepository: MessageRepository,
  conversationRepository: ConversationRepository
): AsyncIterable<StreamChunk> {
  yield { type: 'status', status: 'Analyzing your wardrobe...' }
  yield* runAgentWorkflow(
    getGeneralPrompt(),
    messages,
    conversationId,
    userId,
    createdAt,
    itemService,
    outfitService,
    messageRepository,
    conversationRepository,
  )
}

/**
 * Run agent workflow with proper UIMessage streaming.
 * 
 * Captures and stores all supported UIMessage part types:
 * - TextUIPart: Collected from text-delta chunks, merged into final text blocks
 * - ReasoningUIPart: Collected from reasoning-delta chunks, merged into final reasoning blocks
 * - ToolUIPart: Collected from tool-* chunks, stored directly (preserves tool call state, including error states)
 * - DataUIPart: Collected from data-* chunks, stored directly (preserves data structure)
 * - StepStartUIPart: Collected from step-start chunks, stored directly
 * 
 * All parts are validated and stored in the database via saveState.
 */
async function* runAgentWorkflow(
  systemPrompt: string,
  messages: AgentUIMessage[],
  conversationId: string,
  userId: string,
  createdAt: Date,
  itemService: ItemService,
  outfitService: OutfitService,
  messageRepository: MessageRepository,
  conversationRepository: ConversationRepository
): AsyncIterable<StreamChunk> {
  const tools = createTools({ userId, itemService, outfitService }) satisfies ToolSet
  const agent = createAgent(tools)

  const modelMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...toModelMessages(messages),
  ]

  const result = await agent.stream({ messages: modelMessages })

  const collectedParts: AgentUIMessage['parts'] = []

  type Chunk = InferUIMessageChunk<AgentUIMessage>
  
  for await (const chunk of result.toUIMessageStream<AgentUIMessage>({
    sendStart: false,
  })) {
    if (chunk.type === 'text-delta') {
      const textPart: TextUIPart = {
        type: 'text',
        text: chunk.delta,
        state: 'streaming',
      }
      collectedParts.push(textPart)
      yield { type: 'text-delta', textDelta: chunk.delta }
    } else if (chunk.type === 'reasoning-delta') {
      const reasoningPart: ReasoningUIPart = {
        type: 'reasoning',
        text: chunk.delta,
        state: 'streaming',
      }
      collectedParts.push(reasoningPart)
      yield { type: 'reasoning-delta', reasoningDelta: chunk.delta }
    } else if (chunk.type === 'tool-input-available') {
      const toolChunk = chunk
      const toolPart = {
        type: `tool-${toolChunk.toolName}` as const,
        toolCallId: toolChunk.toolCallId,
        state: 'input-available' as const,
        input: toolChunk.input,
        ...(toolChunk.providerExecuted !== undefined && { providerExecuted: toolChunk.providerExecuted }),
      } as unknown as ToolUIPart<AgentTools>
      collectedParts.push(toolPart)
      yield { type: 'tool-call', toolCall: toolPart }
    } else if (chunk.type === 'tool-output-available') {
      const toolChunk = chunk
      // Find the corresponding input part to get the tool name
      const inputPart = collectedParts
        .filter((p): p is ToolUIPart<AgentTools> => p.type.startsWith('tool-'))
        .find((p) => p.toolCallId === toolChunk.toolCallId && 'input' in p)
      
      if (!inputPart) {
        logger.warn(`No input part found for tool call ${toolChunk.toolCallId}`)
        continue
      }
      
      const toolPart = {
        ...inputPart,
        state: 'output-available' as const,
        output: toolChunk.output,
        ...(toolChunk.providerExecuted !== undefined && { providerExecuted: toolChunk.providerExecuted }),
      } as unknown as ToolUIPart<AgentTools>
      
      // Replace the input part with the complete part
      const inputIndex = collectedParts.indexOf(inputPart)
      if (inputIndex !== -1) {
        collectedParts[inputIndex] = toolPart
      }
      yield { type: 'tool-call', toolCall: toolPart }
    } else if (chunk.type === 'tool-input-error') {
      const toolChunk = chunk
      const toolPart = {
        type: `tool-${toolChunk.toolName}` as const,
        toolCallId: toolChunk.toolCallId,
        state: 'input-available' as const,
        input: toolChunk.input,
        errorText: toolChunk.errorText,
        ...(toolChunk.providerExecuted !== undefined && { providerExecuted: toolChunk.providerExecuted }),
      } as unknown as ToolUIPart<AgentTools>
      collectedParts.push(toolPart)
      yield { type: 'tool-call', toolCall: toolPart }
    } else if (chunk.type === 'tool-output-error') {
      const toolChunk = chunk
      // Find the corresponding input part to get the tool name
      const inputPart = collectedParts
        .filter((p): p is ToolUIPart<AgentTools> => p.type.startsWith('tool-'))
        .find((p) => p.toolCallId === toolChunk.toolCallId && 'input' in p)
      
      if (!inputPart) {
        logger.warn(`No input part found for tool call ${toolChunk.toolCallId}`)
        continue
      }
      
      const toolPart = {
        ...inputPart,
        state: 'output-error' as const,
        errorText: toolChunk.errorText,
        ...(toolChunk.providerExecuted !== undefined && { providerExecuted: toolChunk.providerExecuted }),
      } as unknown as ToolUIPart<AgentTools>
      
      // Replace the input part with the error part
      const inputIndex = collectedParts.indexOf(inputPart)
      if (inputIndex !== -1) {
        collectedParts[inputIndex] = toolPart
      }
      yield { type: 'tool-call', toolCall: toolPart }
    } else if (chunk.type.startsWith('data-')) {
      const dataChunk = chunk as Extract<Chunk, { type: `data-${string}` }>
      const dataPart: DataUIPart<UIDataTypes> = {
        type: dataChunk.type,
        id: dataChunk.id,
        data: dataChunk.data,
      }
      collectedParts.push(dataPart)
      yield { type: 'data-part', dataPart }
    } else if (chunk.type === 'start-step') {
      const stepStartPart: StepStartUIPart = { type: 'step-start' }
      collectedParts.push(stepStartPart)
      yield { type: 'step-start', stepStart: stepStartPart }
    } else if (
      chunk.type === 'text-start' ||
      chunk.type === 'text-end' ||
      chunk.type === 'reasoning-start' ||
      chunk.type === 'reasoning-end' ||
      chunk.type === 'finish-step' ||
      chunk.type === 'finish' ||
      chunk.type === 'start' ||
      chunk.type === 'abort' ||
      chunk.type === 'message-metadata' ||
      chunk.type === 'tool-input-start' ||
      chunk.type === 'tool-input-delta' ||
      chunk.type === 'tool-approval-request' ||
      chunk.type === 'tool-output-denied' ||
      chunk.type === 'error' ||
      chunk.type === 'source-url' ||
      chunk.type === 'source-document' ||
      chunk.type === 'file'
    ) {
      // Store control and lifecycle chunks as data parts for full auditing
      // These chunks contain important metadata about the stream lifecycle
      const auditPart: DataUIPart<UIDataTypes> = {
        type: `data-audit-${chunk.type}` as `data-${string}`,
        id: 'id' in chunk && typeof chunk.id === 'string' ? chunk.id : generateUUID(),
        data: chunk as unknown,
      } as DataUIPart<UIDataTypes>
      collectedParts.push(auditPart)
      continue
    } else {
      logger.warn(`Unknown chunk type: ${chunk.type}`, { chunk })
    }
  }

  const mergedParts: AgentUIMessage['parts'] = []
  let currentText = ''
  let currentReasoning = ''

  const flushAccumulatedParts = () => {
    if (currentText) {
      mergedParts.push({ type: 'text', text: currentText, state: 'done' } as TextUIPart)
      currentText = ''
    }
    if (currentReasoning) {
      mergedParts.push({
        type: 'reasoning',
        text: currentReasoning,
        state: 'done',
      } as ReasoningUIPart)
      currentReasoning = ''
    }
  }

  for (const part of collectedParts) {
    if (part.type === 'text') {
      currentText += part.text
    } else if (part.type === 'reasoning') {
      currentReasoning += part.text
    } else {
      flushAccumulatedParts()
      mergedParts.push(part)
    }
  }
  flushAccumulatedParts()

  const assistantMessage: AgentUIMessage = {
    id: generateUUID(),
    role: 'assistant',
    parts: mergedParts as AgentUIMessage['parts'],
  }

  const validationResult = await safeValidateUIMessages<AgentUIMessage>({
    messages: [assistantMessage],
    tools,
  })

  if (!validationResult.success) {
    logger.error('UIMessage validation failed', {
      error: validationResult.error.message,
      parts: mergedParts.map((p) => p.type),
    })
    throw new Error(`Invalid UIMessage: ${validationResult.error.message}`)
  }

  messages.push(assistantMessage)

  const savedConversationId = await saveState(
    messageRepository,
    conversationRepository,
    {
      conversationId,
      userId,
      messages,
      lastMessageAt: new Date(),
      createdAt,
    },
  )

  logger.info('Workflow completed', {
    conversationId: savedConversationId,
    partCount: mergedParts.length,
    partTypes: mergedParts.map((p) => p.type),
  })
  yield { type: 'metadata', metadata: { conversationId: savedConversationId } }
}

/**
 * Get clarification question for incomplete travel context.
 *
 * @param {TravelContext} travelContext - Travel context
 * @returns {string | null} - Clarification question or null if complete
 */
function getClarificationQuestion(travelContext: TravelContext): string | null {
  if (!travelContext.city) {
    return 'Where are you traveling to?'
  }
  if (!travelContext.startDate || !travelContext.endDate) {
    return 'What dates are you traveling?'
  }
  if (!travelContext.tagMix || Object.keys(travelContext.tagMix).length === 0) {
    return "What mix of outfits do you want? For example: '5 business, 3 casual, 2 running'"
  }
  if (
    !travelContext.itemLimits ||
    Object.keys(travelContext.itemLimits).length === 0
  ) {
    travelContext.itemLimits = { footwear: 2, layer: 1, accessory: 3 }
    return `Any luggage constraints? I'm assuming 2 pairs of shoes, 1 jacket, and 3 accessories. Let me know if you need different limits.`
  }
  if (travelContext.laundryDay === undefined) {
    return 'Will you have laundry available mid-trip, or should I plan for reusing items?'
  }
  return null
}

/**
 * Get conversation context for route classification.
 * Returns last 3-4 conversation turns (6-8 messages) to understand flow state.
 * Includes both user and assistant messages to detect conversation patterns.
 *
 * @param {UIMessage[]} messages - All messages except the current one
 * @returns {Array<{ role: string; content: string }>} - Formatted conversation history
 */
function getClassificationContext(
  messages: AgentUIMessage[]
): Array<{ role: string; content: string }> {
  const recentMessages = messages.slice(-2)
  return toModelMessages(recentMessages)
    .map((msg) => ({
      role: msg.role,
      content: trimForClassification(
        typeof msg.content === 'string' ? msg.content : '',
      ),
    }))
    .filter((msg) => msg.content.length > 0)
}

/**
 * Get user message context for travel details extraction.
 * Returns last 10 user messages for context, as details may be spread across turns.
 * Always includes recent history to ensure comprehensive extraction.
 *
 * @param {UIMessage[]} messages - All messages including current
 * @returns {string[]} - Recent user messages for context (excluding current)
 */
function getExtractionContext(messages: AgentUIMessage[]): string[] {
  const userMessages = messages
    .filter((msg) => msg.role === 'user')
    .slice(-10)
    .map((msg) => extractTextFromParts(msg.parts))
    .filter((text) => text.length > 0)

  return userMessages.slice(0, -1).map((text) => trimForExtraction(text))
}

/**
 * Trim message content for classification context.
 * Preserves beginning (intent) and end (details) when possible.
 *
 * @param {string} content - Message content to trim
 * @param {number} maxLength - Maximum length (default: 300)
 * @returns {string} - Trimmed content
 */
function trimForClassification(content: string, maxLength: number = 300): string {
  if (content.length <= maxLength) {
    return content
  }
  const start = content.slice(0, Math.floor(maxLength * 0.4))
  const end = content.slice(-Math.floor(maxLength * 0.6))
  return `${start}...${end}`
}

/**
 * Trim message content for extraction context.
 * Preserves full message when possible, only trims if extremely long.
 *
 * @param {string} content - Message content to trim
 * @param {number} maxLength - Maximum length (default: 400)
 * @returns {string} - Trimmed content
 */
function trimForExtraction(content: string, maxLength: number = 400): string {
  if (content.length <= maxLength) {
    return content
  }
  return content.slice(-maxLength)
}
