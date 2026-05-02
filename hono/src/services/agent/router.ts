import { generateObject } from 'ai'
import { z } from 'zod'

import { createLogger } from '../../utils/logger'
import { getLowModel } from '../../utils/model-provider'
import {
  getRouteClassificationPrompt,
  getTravelExtractionPrompt,
} from './prompts'
import type { RouteResult } from './types'

const logger = createLogger('AgentRouter')

const routeSchema = z.object({
  route: z
    .enum(['unsafe', 'offtopic', 'travel', 'general'])
    .describe('The detected route'),
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
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<RouteResult> {
  const { object } = await generateObject({
    model: getLowModel(),
    schema: routeSchema,
    prompt: getRouteClassificationPrompt(message, conversationHistory),
  })

  return object as RouteResult
}

/**
 * Extract travel details from user message and recent conversation history.
 * Returns extracted fields or null if not found.
 *
 * @param {string} message - Current user message
 * @param {string[]} recentMessages - Recent user messages for context (optional)
 */
export async function extractTravelDetails(
  message: string,
  recentMessages?: string[]
) {
  const travelSchema = z.object({
    city: z.string().optional().describe('Destination city if mentioned'),
    startDate: z
      .string()
      .optional()
      .describe('Trip start date in YYYY-MM-DD format if mentioned'),
    endDate: z
      .string()
      .optional()
      .describe('Trip end date in YYYY-MM-DD format if mentioned'),
    tripLength: z
      .number()
      .optional()
      .describe('Trip duration in days if mentioned'),
    tagMix: z
      .record(z.string(), z.number())
      .optional()
      .describe('Outfit counts per tag (e.g., {"business": 5, "casual": 3})'),
    itemLimits: z
      .record(z.string(), z.number())
      .optional()
      .describe(
        'Item limits per type (e.g., {"footwear": 2, "layer": 1, "accessory": 3})'
      ),
    laundryDay: z
      .number()
      .optional()
      .describe('Day number for laundry if mentioned'),
  })

  const { object } = await generateObject({
    model: getLowModel(),
    schema: travelSchema,
    prompt: getTravelExtractionPrompt(message, recentMessages),
  })

  const extractedFields = Object.keys(object).filter(
    (key) => key in object && object[key as keyof typeof object] !== undefined
  )
  if (extractedFields.length > 0) {
    logger.debug(`Travel extracted: ${extractedFields.join(',')}`)
  }

  return object
}
