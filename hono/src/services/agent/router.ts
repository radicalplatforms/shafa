import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

import { getRouteClassificationPrompt, getTravelExtractionPrompt } from './prompts'
import type { RouteResult } from './types'

const routeSchema = z.object({
  route: z.enum(['unsafe', 'offtopic', 'travel', 'general']).describe('The detected route'),
  reason: z.string().describe('Brief explanation for this routing decision'),
  summary: z.string().describe('4-10 word summary of the classification'),
  response: z.string().describe('Natural, conversational response to the user'),
})

/**
 * Classify user message into one of four routes:
 * - unsafe: inappropriate, volatile, or harmful requests
 * - offtopic: unrelated to wardrobe, outfits, or travel
 * - travel: trip planning, packing, dates, locations, itineraries
 * - general: all other wardrobe-related queries
 */
export async function classifyRoute(
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  context?: any
): Promise<RouteResult> {
  console.log('[Router] Classifying route for message:', message.substring(0, 100) + '...')
  console.log('[Router] Conversation history length:', conversationHistory?.length || 0)
  console.log('[Router] Has travel context:', !!context?.travelContext)

  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'),
    schema: routeSchema,
    prompt: getRouteClassificationPrompt(message, conversationHistory, context),
  })

  console.log('[Router] Route classification result:', {
    route: object.route,
    reason: object.reason,
    summary: object.summary,
  })

  return object as RouteResult
}

/**
 * Extract travel details from user message.
 * Returns extracted fields or null if not found.
 */
export async function extractTravelDetails(message: string) {
  console.log('[Router] Extracting travel details from message:', message.substring(0, 100) + '...')

  const travelSchema = z.object({
    city: z.string().optional().describe('Destination city if mentioned'),
    startDate: z.string().optional().describe('Trip start date in YYYY-MM-DD format if mentioned'),
    endDate: z.string().optional().describe('Trip end date in YYYY-MM-DD format if mentioned'),
    tripLength: z.number().optional().describe('Trip duration in days if mentioned'),
    tagMix: z
      .record(z.string(), z.number())
      .optional()
      .describe('Outfit counts per tag (e.g., {"business": 5, "casual": 3})'),
    itemLimits: z
      .record(z.string(), z.number())
      .optional()
      .describe('Item limits per type (e.g., {"footwear": 2, "layer": 1, "accessory": 3})'),
    laundryDay: z.number().optional().describe('Day number for laundry if mentioned'),
  })

  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'),
    schema: travelSchema,
    prompt: getTravelExtractionPrompt(message),
  })

  console.log('[Router] Travel details extracted:', object)
  return object
}
