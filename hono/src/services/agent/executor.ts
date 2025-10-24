import type { CoreMessage as Message } from 'ai'

import type { DBVariables } from '../../utils/inject-db'
import type { ItemService } from '../ItemService'
import type { OutfitService } from '../OutfitService'
import type { SimilarityService } from '../SimilarityService'
import type { WeatherService } from '../WeatherService'
import { createAgent } from './agent'
import { getGeneralPrompt, getTravelPrompt } from './prompts'
import { classifyRoute, extractTravelDetails } from './router'
import { loadState, saveState } from './state'
import { createTools } from './tools'

/**
 * Format streaming text to ensure proper newlines and markdown formatting.
 * This addresses Claude 4 Sonnet's streaming behavior where newlines
 * may not be properly streamed between sentences and markdown elements.
 */
function formatStreamingText(text: string): string {
  let formatted = text

  // Add newlines after sentence endings (. ! ?) when followed by capital letter
  formatted = formatted.replace(/([.!?])(\s*)([A-Z])/g, '$1\n\n$3')

  // Add newlines before MDX tags to ensure they're on their own lines
  formatted = formatted.replace(/(\S)(<outfit_existing|<outfit_suggested|<item)/g, '$1\n\n$2')

  // Fix markdown formatting - ensure proper spacing for bullets and headings
  // Add newlines before bullet points that aren't already on new lines
  formatted = formatted.replace(/(\S)(\s*)([-*+])(\s)/g, '$1\n\n$3$4')

  // Add newlines before headings that aren't already on new lines
  formatted = formatted.replace(/(\S)(\s*)(#{1,6}\s)/g, '$1\n\n$3')

  // Ensure double newlines before major sections (headings with ## or more)
  formatted = formatted.replace(/(\S)(\s*)(#{2,6}\s)/g, '$1\n\n$3')

  // Clean up multiple consecutive newlines (more than 2)
  formatted = formatted.replace(/\n{3,}/g, '\n\n')

  return formatted
}

export interface ExecuteAgentStreamParams {
  userId: string
  message: string
  conversationId?: string
  itemService: ItemService
  outfitService: OutfitService
  similarityService: SimilarityService
  weatherService: WeatherService
  db: DBVariables['db']
}

export type StreamChunk =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'metadata'; metadata: { conversationId: string } }
  | { type: 'status'; status: string }

/**
 * Execute agent with new loop stages:
 * 1. Receive message
 * 2. Intent and safety check (unsafe/offtopic/travel/general)
 * 3. Clarification phase (for travel)
 * 4. Tool execution
 * 5. Response assembly
 *
 * @param {ExecuteAgentStreamParams} params - Execution parameters
 * @returns {AsyncIterable<StreamChunk>} - Stream of text chunks and metadata
 */
export async function* executeAgentStream(
  params: ExecuteAgentStreamParams
): AsyncIterable<StreamChunk> {
  const { userId, message, conversationId } = params
  const { itemService, outfitService, similarityService, weatherService, db } = params

  console.log('[Executor] Starting agent execution', {
    userId,
    conversationId,
    messageLength: message.length,
    hasServices: {
      itemService: !!itemService,
      outfitService: !!outfitService,
      similarityService: !!similarityService,
      weatherService: !!weatherService,
    },
  })

  // Stage 1: Receive message
  yield { type: 'status', status: 'Processing message' }
  const trimmedMessage = message.trim()
  console.log('[Executor] Message processed, length:', trimmedMessage.length)

  const state = await loadState(db, userId, conversationId)
  const messages: Message[] = state?.messages || []
  const context = state?.context || { userId, conversationId }

  console.log('[Executor] State loaded', {
    hasState: !!state,
    messageCount: messages.length,
    hasContext: !!context,
    hasTravelContext: !!context.travelContext,
  })

  // Ensure context has the current conversationId
  if (conversationId && !context.conversationId) {
    context.conversationId = conversationId
  }

  messages.push({
    role: 'user',
    content: trimmedMessage,
  })

  // Stage 2: Intent and safety check
  yield { type: 'status', status: 'Understanding your request...' }
  console.log('[Executor] Starting route classification')

  // Convert messages to simple format for route classification
  const conversationHistory = messages.slice(0, -1).map((msg) => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }))

  yield { type: 'status', status: 'Determining the best approach...' }
  const routeResult = await classifyRoute(trimmedMessage, conversationHistory, context)
  console.log('[Executor] Route classified', {
    route: routeResult.route,
    reason: routeResult.reason,
    summary: routeResult.summary,
  })

  // Handle unsafe route
  if (routeResult.route === 'unsafe') {
    console.log('[Executor] Handling unsafe route - blocking request')
    const assistantMessage: Message = {
      role: 'assistant',
      content: routeResult.response,
    }
    messages.push(assistantMessage)

    const savedConversationId = await saveState(db, {
      conversationId: conversationId || '',
      userId,
      messages,
      context,
      lastMessageAt: new Date(),
      createdAt: state?.createdAt || new Date(),
    })
    console.log('[Executor] Unsafe route handled, conversation saved:', savedConversationId)

    yield { type: 'text-delta', textDelta: routeResult.response }
    yield { type: 'metadata', metadata: { conversationId: savedConversationId } }
    return
  }

  // Handle offtopic route
  if (routeResult.route === 'offtopic') {
    console.log('[Executor] Handling offtopic route - redirecting to wardrobe topics')
    const assistantMessage: Message = {
      role: 'assistant',
      content: routeResult.response,
    }
    messages.push(assistantMessage)

    const savedConversationId = await saveState(db, {
      conversationId: conversationId || '',
      userId,
      messages,
      context,
      lastMessageAt: new Date(),
      createdAt: state?.createdAt || new Date(),
    })
    console.log('[Executor] Offtopic route handled, conversation saved:', savedConversationId)

    yield { type: 'text-delta', textDelta: routeResult.response }
    yield { type: 'metadata', metadata: { conversationId: savedConversationId } }
    return
  }

  // Stage 3: Clarification phase (travel route)
  if (routeResult.route === 'travel') {
    console.log('[Executor] Handling travel route - extracting travel details')
    yield { type: 'status', status: 'Planning your travel wardrobe...' }
    // Extract travel details from current message
    yield { type: 'status', status: 'Extracting travel details...' }
    const extractedDetails = await extractTravelDetails(trimmedMessage)
    console.log('[Executor] Travel details extracted:', extractedDetails)

    // Merge with existing travel context
    const travelContext = {
      ...context.travelContext,
      ...extractedDetails,
    }

    // Update the context with the merged travel context
    context.travelContext = travelContext

    // If we still don't have city or dates, try to extract from conversation history
    if (!travelContext.city || !travelContext.startDate || !travelContext.endDate) {
      // Look through previous messages for travel details
      for (const msg of messages) {
        if (msg.role === 'user' && typeof msg.content === 'string') {
          const historicalDetails = await extractTravelDetails(msg.content)
          if (historicalDetails.city && !travelContext.city) {
            travelContext.city = historicalDetails.city
          }
          if (historicalDetails.startDate && !travelContext.startDate) {
            travelContext.startDate = historicalDetails.startDate
          }
          if (historicalDetails.endDate && !travelContext.endDate) {
            travelContext.endDate = historicalDetails.endDate
          }
        }
      }
    }

    // Sequential clarification with defaults
    let needsClarification = false
    let clarificationQuestion = ''

    // 1. City (required)
    if (!travelContext.city) {
      clarificationQuestion = 'Where are you traveling to?'
      needsClarification = true
    }
    // 2. Dates (required)
    else if (!travelContext.startDate || !travelContext.endDate) {
      clarificationQuestion = 'What dates are you traveling?'
      needsClarification = true
    }
    // 3. Tag mix (required)
    else if (!travelContext.tagMix || Object.keys(travelContext.tagMix).length === 0) {
      clarificationQuestion =
        "What mix of outfits do you want? For example: '5 business, 3 casual, 2 running'"
      needsClarification = true
    }
    // 4. Item limits (optional with defaults)
    else if (!travelContext.itemLimits || Object.keys(travelContext.itemLimits).length === 0) {
      // Set sensible defaults
      travelContext.itemLimits = {
        footwear: 2,
        layer: 1,
        accessory: 3,
      }
      clarificationQuestion = `Any luggage constraints? I'm assuming 2 pairs of shoes, 1 jacket, and 3 accessories. Let me know if you need different limits for any item type.`
      needsClarification = true
    }
    // 5. Laundry (optional)
    else if (travelContext.laundryDay === undefined) {
      clarificationQuestion =
        'Will you have laundry available mid-trip, or should I plan for reusing items within the limits?'
      needsClarification = true
    }

    if (needsClarification) {
      console.log('[Executor] Travel route - asking clarification:', clarificationQuestion)
      const assistantMessage: Message = {
        role: 'assistant',
        content: clarificationQuestion,
      }
      messages.push(assistantMessage)

      const savedConversationId = await saveState(db, {
        conversationId: conversationId || '',
        userId,
        messages,
        context,
        lastMessageAt: new Date(),
        createdAt: state?.createdAt || new Date(),
      })
      console.log('[Executor] Travel clarification saved, conversationId:', savedConversationId)

      yield { type: 'text-delta', textDelta: clarificationQuestion }
      yield { type: 'metadata', metadata: { conversationId: savedConversationId } }
      return
    }

    // Stage 4: Pre-agent orchestration
    console.log('[Executor] Travel route - executing travel workflow', {
      city: travelContext.city,
      startDate: travelContext.startDate,
      endDate: travelContext.endDate,
      tagMix: travelContext.tagMix,
      itemLimits: travelContext.itemLimits,
    })

    yield { type: 'status', status: 'Fetching weather forecast...' }

    // Fetch weather and derive climate buckets
    const weatherData = await weatherService.weatherRange({
      location: travelContext.city!,
      startDate: travelContext.startDate!,
      endDate: travelContext.endDate!,
    })

    console.log('[Executor] Weather data fetched:', weatherData.length, 'days')

    // Derive climate buckets from weather
    const climateBuckets = weatherData.map((day) => {
      const avgTemp = (day.tempHigh + day.tempLow) / 2
      let bucket = 'mild'

      if (avgTemp < 45) bucket = 'cold'
      else if (avgTemp < 60) bucket = 'cool'
      else if (avgTemp < 70) bucket = 'mild'
      else if (avgTemp < 80) bucket = 'warm'
      else bucket = 'hot'

      // Add wet classification for precipitation
      if (day.conditions.includes('rain')) {
        bucket += '_wet'
      }

      return {
        date: day.date,
        climate: bucket,
        tempHigh: day.tempHigh,
        tempLow: day.tempLow,
        conditions: day.conditions,
      }
    })

    console.log(
      '[Executor] Climate buckets derived:',
      climateBuckets.map((cb: any) => `${cb.date}: ${cb.climate}`)
    )

    // Create itinerary plan with day slots
    const totalDays =
      Math.ceil(
        (new Date(travelContext.endDate!).getTime() -
          new Date(travelContext.startDate!).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    const itineraryPlan = []

    // Distribute outfit types across days
    const tagDistribution = distributeOutfitsAcrossDays(travelContext.tagMix || {}, totalDays)

    for (let i = 0; i < totalDays; i++) {
      const dayClimate = climateBuckets[i] || { climate: 'mild', date: travelContext.startDate }
      const dayTag = tagDistribution[i] || 'casual'

      itineraryPlan.push({
        day: i + 1,
        date: dayClimate.date,
        tag: dayTag,
        climate: dayClimate.climate,
        tempHigh: dayClimate.tempHigh,
        tempLow: dayClimate.tempLow,
        conditions: dayClimate.conditions,
      })
    }

    const planLength: number = itineraryPlan.length
    console.log('[Executor] Itinerary plan created:', planLength, 'days')

    // Update travel context with derived data
    const contextWithData = travelContext as any
    contextWithData.climateBuckets = climateBuckets
    contextWithData.itineraryPlan = itineraryPlan

    yield { type: 'status', status: 'Preparing to build your travel outfits...' }
    yield* executeTravelWorkflow({
      userId,
      travelContext,
      messages,
      context,
      conversationId,
      weatherService,
      outfitService,
      itemService,
      similarityService,
      db,
      state,
    })
    return
  }

  // Stage 4: Tool execution (general route)
  console.log('[Executor] General route - executing general workflow')
  yield { type: 'status', status: 'Analyzing your request and planning response...' }
  yield* executeGeneralWorkflow({
    userId,
    trimmedMessage,
    messages,
    context,
    conversationId,
    itemService,
    outfitService,
    similarityService,
    weatherService,
    db,
    state,
  })
}

/**
 * Execute travel workflow:
 * 1. Fetch weather_range
 * 2. Search/build outfits
 * 3. Return structured response with text + outfits + items
 */
async function* executeTravelWorkflow(params: any): AsyncIterable<StreamChunk> {
  const {
    userId,
    travelContext,
    messages,
    context,
    conversationId,
    weatherService,
    outfitService,
    itemService,
    similarityService,
    db,
    state,
  } = params

  console.log('[Executor] Starting travel workflow', {
    userId,
    conversationId,
    travelContext,
  })

  yield { type: 'status', status: 'Preparing travel wardrobe tools...' }
  const tools = createTools({
    userId,
    itemService,
    outfitService,
    similarityService,
    weatherService,
  })
  console.log('[Executor] Travel workflow - tools created')

  const systemPrompt = getTravelPrompt(travelContext)
  console.log('[Executor] Travel workflow - system prompt generated')

  const agentMessages: Message[] = [{ role: 'system', content: systemPrompt }, ...messages]
  console.log('[Executor] Travel workflow - agent messages prepared, count:', agentMessages.length)

  yield { type: 'status', status: 'Analyzing weather and planning travel outfits...' }
  const agent = createAgent(tools)
  console.log('[Executor] Travel workflow - starting agent stream')
  const result = await agent.stream({ messages: agentMessages })

  // Add a brief thinking pause before streaming the response
  yield { type: 'status', status: 'Preparing your travel wardrobe recommendations...' }

  // Stream the text using textStream for proper newline handling
  console.log('[Executor] Travel workflow - streaming response')
  let chunkCount = 0
  let totalTextLength = 0
  for await (const chunk of result.textStream) {
    chunkCount++
    totalTextLength += chunk.length
    console.log(`[Executor] Travel workflow - chunk ${chunkCount}:`, {
      chunkLength: chunk.length,
      totalLength: totalTextLength,
      chunkPreview: chunk.substring(0, 50) + (chunk.length > 50 ? '...' : ''),
    })
    const formatted = formatStreamingText(chunk)
    yield { type: 'text-delta', textDelta: formatted }
  }
  console.log(
    `[Executor] Travel workflow - streaming completed: ${chunkCount} chunks, ${totalTextLength} total chars`
  )

  const fullResponse = await result.text
  console.log('[Executor] Travel workflow - response completed, length:', fullResponse.length)

  const assistantMessage: Message = {
    role: 'assistant',
    content: fullResponse,
  }

  const savedConversationId = await saveState(db, {
    conversationId: conversationId || '',
    userId,
    messages: [...messages, assistantMessage],
    context,
    lastMessageAt: new Date(),
    createdAt: state?.createdAt || new Date(),
  })
  console.log('[Executor] Travel workflow - conversation saved:', savedConversationId)

  yield { type: 'metadata', metadata: { conversationId: savedConversationId } }
}

/**
 * Execute general workflow for everyday wardrobe queries
 */
async function* executeGeneralWorkflow(params: any): AsyncIterable<StreamChunk> {
  const {
    userId,
    messages,
    context,
    conversationId,
    itemService,
    outfitService,
    similarityService,
    weatherService,
    db,
    state,
  } = params

  console.log('[Executor] Starting general workflow', {
    userId,
    conversationId,
    messageCount: messages.length,
  })

  yield { type: 'status', status: 'Preparing wardrobe analysis tools...' }
  const tools = createTools({
    userId,
    itemService,
    outfitService,
    similarityService,
    weatherService,
  })
  console.log('[Executor] General workflow - tools created')

  const systemPrompt = getGeneralPrompt()
  console.log('[Executor] General workflow - system prompt generated')

  const agentMessages: Message[] = [{ role: 'system', content: systemPrompt }, ...messages]
  console.log('[Executor] General workflow - agent messages prepared, count:', agentMessages.length)

  yield { type: 'status', status: 'Analyzing your wardrobe and crafting response...' }
  const agent = createAgent(tools)
  console.log('[Executor] General workflow - starting agent stream')
  const result = await agent.stream({ messages: agentMessages })

  // Add a brief thinking pause before streaming the response
  yield { type: 'status', status: 'Preparing your personalized response...' }

  // Stream the text using textStream for proper newline handling
  console.log('[Executor] General workflow - streaming response')
  let chunkCount = 0
  let totalTextLength = 0
  for await (const chunk of result.textStream) {
    chunkCount++
    totalTextLength += chunk.length
    console.log(`[Executor] General workflow - chunk ${chunkCount}:`, {
      chunkLength: chunk.length,
      totalLength: totalTextLength,
      chunkPreview: chunk.substring(0, 50) + (chunk.length > 50 ? '...' : ''),
    })
    const formatted = formatStreamingText(chunk)
    yield { type: 'text-delta', textDelta: formatted }
  }
  console.log(
    `[Executor] General workflow - streaming completed: ${chunkCount} chunks, ${totalTextLength} total chars`
  )

  const fullResponse = await result.text
  console.log('[Executor] General workflow - response completed, length:', fullResponse.length)
  const assistantMessage: Message = {
    role: 'assistant',
    content: fullResponse,
  }

  const savedConversationId = await saveState(db, {
    conversationId: conversationId || '',
    userId,
    messages: [...messages, assistantMessage],
    context,
    lastMessageAt: new Date(),
    createdAt: state?.createdAt || new Date(),
  })
  console.log('[Executor] General workflow - conversation saved:', savedConversationId)

  yield { type: 'metadata', metadata: { conversationId: savedConversationId } }
}

/**
 * Distribute outfit types across days for itinerary planning
 */
function distributeOutfitsAcrossDays(tagMix: Record<string, number>, totalDays: number): string[] {
  const distribution: string[] = []
  const tags = Object.keys(tagMix)
  const counts = Object.values(tagMix)

  if (tags.length === 0) {
    // Default to casual if no tag mix specified
    return Array(totalDays).fill('casual')
  }

  // Create array of tags to distribute
  const tagArray: string[] = []
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]
    const count = counts[i]
    for (let j = 0; j < count; j++) {
      tagArray.push(tag)
    }
  }

  // Shuffle and distribute across days
  const shuffled = [...tagArray].sort(() => Math.random() - 0.5)

  for (let day = 0; day < totalDays; day++) {
    if (day < shuffled.length) {
      distribution.push(shuffled[day])
    } else {
      // Fill remaining days with the most common tag
      const mostCommonTag = tags[counts.indexOf(Math.max(...counts))]
      distribution.push(mostCommonTag)
    }
  }

  return distribution
}
