import { safeValidateUIMessages, type CoreMessage, type UIMessage } from 'ai'

import { agentMessage } from '../../schema'
import type { MessageRepository } from '../../repositories/MessageRepository'
import type { ConversationRepository } from '../../repositories/ConversationRepository'
import { createLogger } from '../../utils/logger'
import type { AgentState } from './types'

const logger = createLogger('AgentState')

/**
 * Load conversation state up to a specific message.
 * For user messages, includes the message in history.
 * For assistant messages (retry case), excludes the message and includes up to its parent.
 *
 * @param {MessageRepository} messageRepository - Message repository
 * @param {ConversationRepository} conversationRepository - Conversation repository
 * @param {string} messageId - Message ID to load up to
 * @returns {Promise<AgentState | null>} - Agent state or null if not found
 */
export async function loadState(
  messageRepository: MessageRepository,
  conversationRepository: ConversationRepository,
  messageId: string
): Promise<AgentState | null> {
  const targetMessage = await messageRepository.findById(messageId)
  if (!targetMessage) {
    logger.warn(`Message not found [msg:${messageId.slice(0, 8)}]`)
    return null
  }

  const conversationId = targetMessage.conversationId
  const conversation = await conversationRepository.findById(conversationId)
  if (!conversation) {
    logger.warn(`Conversation not found [conv:${conversationId.slice(0, 8)}]`)
    return null
  }

  const allMessageRows = await messageRepository.findActivePathMessages(
    conversationId
  )

  const targetIndex = allMessageRows.findIndex((m) => m.id === messageId)
  if (targetIndex === -1) {
    logger.warn(`Message not in active path [conv:${conversationId.slice(0, 8)} msg:${messageId.slice(0, 8)}]`)
    return null
  }

  let messagesToInclude: typeof agentMessage.$inferSelect[]
  if (targetMessage.role === 'user') {
    messagesToInclude = allMessageRows.slice(0, targetIndex + 1)
  } else {
    messagesToInclude = allMessageRows.slice(0, targetIndex)
  }

  const messages: UIMessage[] = messagesToInclude.map((row) => ({
    id: row.id,
    role: row.role as 'user' | 'assistant',
    parts: row.parts as any,
    metadata: row.metadata as any,
  }))

  const validationResult = await safeValidateUIMessages({ messages })

  if (!validationResult.success) {
    logger.error(`Validation failed: ${validationResult.error.message} [conv:${conversationId.slice(0, 8)} msg:${messageId.slice(0, 8)}]`)
    throw new Error(
      `Invalid UIMessages loaded from database: ${validationResult.error.message}`
    )
  }

  logger.debug(`State loaded (${messages.length} msgs, ${targetMessage.role}) [conv:${conversationId.slice(0, 8)} msg:${messageId.slice(0, 8)}]`)

  return {
    conversationId: conversation.id,
    userId: conversation.userId || '',
    messages: validationResult.data,
    lastMessageAt: conversation.updatedAt,
    createdAt: conversation.createdAt,
  }
}

/**
 * Save conversation state to database.
 *
 * @param {MessageRepository} messageRepository - Message repository
 * @param {ConversationRepository} conversationRepository - Conversation repository
 * @param {AgentState} state - Agent state to save
 * @returns {Promise<string>} - Conversation ID
 */
export async function saveState(
  messageRepository: MessageRepository,
  conversationRepository: ConversationRepository,
  state: AgentState
): Promise<string> {
  const conversationId = await conversationRepository.getOrCreateConversation(
    state.userId,
    state.conversationId,
    false
  )

  const existingMessages = await messageRepository.findActivePathMessages(
    conversationId
  )

  const messagesToProcess = state.messages.slice(existingMessages.length)

  let parentId: string | null =
    existingMessages.length > 0
      ? existingMessages[existingMessages.length - 1].id
      : null

  for (const uiMessage of messagesToProcess) {
    const saved = await messageRepository.createMessage(
      conversationId,
      uiMessage,
      parentId
    )
    parentId = saved.id
  }

  if (messagesToProcess.length > 0) {
    logger.debug(`State saved (+${messagesToProcess.length} msgs) [conv:${conversationId.slice(0, 8)}]`)
  }
  return conversationId
}

/**
 * Convert UIMessage to CoreMessage for model consumption.
 * Extracts text content from parts and preserves role.
 *
 * @param {UIMessage} uiMessage - The UIMessage to convert
 * @returns {CoreMessage} - CoreMessage for model
 */
function toModelMessage(uiMessage: UIMessage): CoreMessage {
  const textContent = uiMessage.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as any).text)
    .join('')

  return {
    role: uiMessage.role,
    content: textContent,
  }
}

/**
 * Convert UIMessages to CoreMessages for model consumption.
 *
 * @param {UIMessage[]} messages - UIMessages to convert
 * @returns {CoreMessage[]} - CoreMessages for model
 */
export function toModelMessages(messages: UIMessage[]): CoreMessage[] {
  return messages.map(toModelMessage)
}
