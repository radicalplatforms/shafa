import { zValidator } from '@hono/zod-validator'
import { ChatOpenAI } from '@langchain/openai'
import { Hono } from 'hono'
import { createAgent, tool } from 'langchain'
import { z } from 'zod'

import { agentChat, itemTypeEnum } from '../schema'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'
import type { ItemService } from './ItemService'
import type { OutfitService } from './OutfitService'
import type { TagService } from './TagService'

type ToolInput = Record<string, unknown>

const AgentResponseSchema = z.object({
  sections: z.array(
    z.object({
      content: z.union([
        z.object({
          outfitList: z.array(
            z.object({
              existing: z.object({
                id: z.string(),
              }),
              suggestion: z.object({
                outfitItems: z.array(
                  z.object({
                    itemId: z.string(),
                    itemType: z.enum(['layer', 'top', 'bottom', 'footwear', 'accessory']),
                  })
                ),
              }),
            })
          ),
        }),
        z.object({
          itemList: z.array(
            z.object({
              id: z.string(),
            })
          ),
        }),
        z.object({
          text: z.string(),
        }),
      ]),
    })
  ),
})

const AgentRequestSchema = z.object({
  message: z.string().min(1).max(1000),
})

const createToolsWithContext = (
  userId: string,
  services: {
    itemService: ItemService
    outfitService: OutfitService
    tagService: TagService
  }
) => {
  /**
   * Filter items by type
   */
  const getItemsByType = tool(
    async (input: ToolInput) => {
      const result = await services.itemService.getItemsByType(userId, input.itemType as string)
      return result && result.length > 0 ? JSON.stringify(result) : 'NONE'
    },
    {
      name: 'getItemsByType',
      description:
        'Filters items by clothing type category. Returns ALL items of specified type (layer/top/bottom/footwear/accessory). Returns JSON array of item objects with full details. Use when user asks for all items of a specific type (e.g., "show me all my tops").',
      schema: z.object({
        itemType: z.enum(itemTypeEnum),
      }),
    }
  )

  /**
   * Filter items by status
   */
  const getItemsByStatus = tool(
    async (input: ToolInput) => {
      const result = await services.itemService.getItemsByStatus(userId, input.status as string)
      return result && result.length > 0 ? JSON.stringify(result) : 'NONE'
    },
    {
      name: 'getItemsByStatus',
      description:
        "Filters items by availability status. Status can be 'available' (in rotation), 'withheld' (temporarily removed), or 'retired' (permanently removed). Returns JSON array of item objects with full details. Use when user asks about available, withheld, or retired items.",
      schema: z.object({
        status: z.enum(['available', 'withheld', 'retired']),
      }),
    }
  )

  /**
   * Search items by name, brand, or tag
   */
  const searchItems = tool(
    async (input: ToolInput) => {
      const result = await services.itemService.searchItems(userId, input.query as string)
      return result && result.length > 0 ? JSON.stringify(result) : 'NONE'
    },
    {
      name: 'searchItems',
      description:
        'PRIMARY tool for finding items by keywords. Searches item name, brand, and associated tags from worn outfits. Query is split by whitespace, matches any word in name/brand/tags (case-insensitive). Returns JSON array of item objects with full details. Use when user asks about specific items, brands, or style tags.',
      schema: z.object({
        query: z.string().min(1),
      }),
    }
  )

  /**
   * Get flattened outfits with full item details and deduplication logic
   */
  const getFlattenedOutfits = tool(
    async (_: ToolInput) => {
      const result = await services.outfitService.getFlattenedOutfits(userId)
      return result && result.length > 0 ? JSON.stringify(result) : 'NONE'
    },
    {
      name: 'getFlattenedOutfits',
      description:
        'Returns deduplicated outfit history with full details. Filters to most recent outfit for each unique combination of core items (layers/tops/bottoms). Includes full item details, tags, and virtual tags (like "Idea" for unworn outfits). Returns complete outfit objects with items and tags. Use when user wants to see their outfit history or analyze past combinations.',
      schema: z.object({}),
    }
  )

  /**
   * Get outfit suggestions
   */
  const getSuggestedOutfits = tool(
    async (input: ToolInput) => {
      const result = await services.outfitService.getSuggestions(userId, {
        tagId: input.tagId as string,
        size: input.limit as number,
      })
      return result.suggestions && result.suggestions.length > 0 ? JSON.stringify(result.suggestions) : 'NONE'
    },
    {
      name: 'getSuggestedOutfits',
      description:
        'Generates personalized outfit recommendations. Algorithm scores outfits based on item freshness (time since worn), rating (hit/mid/miss), and frequency. Optional tagId parameter filters suggestions to specific occasions/styles. Only suggests complete outfits (top/layer + bottom + footwear). Returns ranked outfit suggestions with scoring details. Use when user asks for outfit ideas, what to wear, or suggestions for specific occasions.',
      schema: z.object({
        tagId: z.string(),
        limit: z.number().min(1).max(50),
      }),
    }
  )

  /**
   * Get outfits by tag
   */
  const getOutfitsByTag = tool(
    async (input: ToolInput) => {
      const result = await services.outfitService.getOutfitsByTag(userId, input.tagId as string)
      return result && result.length > 0 ? JSON.stringify(result) : 'NONE'
    },
    {
      name: 'getOutfitsByTag',
      description:
        'Filters outfits by specific tag. Supports both user tags and virtual tags (Idea, Recent, Frequent, High-rated, Low-rated). Returns outfits that have the specified tag. Use when user asks for outfits for specific occasions or with specific characteristics.',
      schema: z.object({
        tagId: z.string(),
      }),
    }
  )

  /**
   * Get all tags including virtual tags
   */
  const getAllTags = tool(
    async (_: ToolInput) => {
      const result = await services.tagService.getAllTags(userId)
      return result && result.length > 0 ? JSON.stringify(result) : 'NONE'
    },
    {
      name: 'getAllTags',
      description:
        'Returns all available tags. Includes user-created tags AND virtual tags (Idea, Recent, Frequent, High-rated, Low-rated). Virtual tags are system-generated based on outfit characteristics. Returns list of tag objects with id, name, hexColor. Use when user asks about available tags or occasions, or you need tag IDs for filtering.',
      schema: z.object({}),
    }
  )

  return [
    getItemsByType,
    getItemsByStatus,
    searchItems,
    getFlattenedOutfits,
    getSuggestedOutfits,
    getOutfitsByTag,
    getAllTags,
  ]
}

const analysisPrompt = (message: string) => `Analyze this fashion/wardrobe request and provide:
1. A 4-10 word summary of what the user is asking for
2. The expected reasoning effort level: low, medium, or high

Examples:
- "What should I wear today?" → summary: "Daily outfit suggestion", effort: "medium"
- "Create a travel wardrobe for 2 weeks in Europe" → summary: "Comprehensive travel wardrobe planning", effort: "high" 
- "Find my blue jeans" → summary: "Locate specific item", effort: "medium"
- "What colors go well together?" → summary: "Color coordination advice", effort: "low"
- "Help me style this outfit" → summary: "Outfit styling advice", effort: "medium"

As soon as a query can involve items or outfits, the effort should be medium or high.
General queries about wardrobe organization, clothing types, or style advice should be low.

Respond in JSON format:
{
  "summary": "brief description",
  "reasoningEffort": "low|medium|high"
}

User request: "${message}"`

const systemPrompt = `
You are a fashion stylist and wardrobe consultant. 
Help clients with their wardrobe questions using their data.

Take your time to understand the client's request and analyze their existing
items, outfits, and wear patterns to provide the best possible advice. 
Notice how they like to wear certain items and try to avoid suggesting too many new outfits. Have trust in their style.

Your response should be a set of interleaved text, existing or new suggested outfits as a list, or existing items as a list. For outfits, either provide the existing outfit ID or provide a full suggestion including all existing items and their types in that outfit. Organize these however you'd like.

Example: client may request a new outfit. A good response would be a terse set of text,
an outfit suggestion using the outfit list, then a final set of text.

Example: a client may request a travel packing list. A good response would be a terse set of text,
a list of existing outfits and suggested outfits in order, a set of text, a list of items acting as a packing list, then a final set of text.

Be careful with tool calls, try not to overuse them and write targeted queries with care.

NEVER create new items out of thin air, only suggest existing items. Outfit suggestions must always include all existing items.

Don't suggest follow ups at this time.`


const app = new Hono<{
  Variables: AuthVariables & DBVariables & ServiceVariables & { isAgentRequest: boolean }
}>().post(
  '/',
  zValidator('json', AgentRequestSchema),
  requireAuth,
  async (c, next) => {
    // Mark this as an agent request BEFORE injectDB runs
    c.set('isAgentRequest', true)
    await next()
  },
  injectDB,
  injectServices,
  async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const { message } = c.req.valid('json')
    const db = c.get('db')

    if (!userId) {
      return c.json({ error: 'User not authenticated' }, 401)
    }

    try {
      // First pass: analyze the prompt to determine summary and reasoning effort
      const analysisModel = new ChatOpenAI({
        model: 'gpt-5-nano',
        reasoning: { effort: 'minimal' },
      })

      const analysisAgent = createAgent({
        model: analysisModel,
        responseFormat: z.object({
          summary: z.string(),
          reasoningEffort: z.enum(['low', 'medium', 'high']),
        }),
      })

      const analysisResponse = await analysisAgent.invoke({
        messages: [{ role: 'system', content: analysisPrompt(message) }],
      })

      const analysis = analysisResponse.structuredResponse
      console.log('Analysis:', analysis)

      const tools = createToolsWithContext(userId, {
        itemService: c.get('itemService'),
        outfitService: c.get('outfitService'),
        tagService: c.get('tagService'),
      })

      // Second pass: generate the response
      const mainModel = new ChatOpenAI({
        model: 'gpt-5',
        reasoning: { effort: analysis.reasoningEffort },
        verbosity: 'medium',
      })

      const mainAgent = createAgent({
        model: mainModel,
        tools: tools,
        responseFormat: AgentResponseSchema,
      })

      const response = await mainAgent.invoke({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      })

       // Return the structured response directly
       const structuredResponse = response

      await db.transaction(async (tx) => {
        await tx.insert(agentChat).values({
          userId,
          userMessage: message,
          agentResponse: JSON.stringify(response),
          summary: analysis.summary,
          reasoningEffort: analysis.reasoningEffort,
        })
      })

       return c.json(structuredResponse)
    } catch (error) {
      console.error('Agent error:', error)
      return c.json({ error: 'Failed to process request' }, 500)
    } finally {
      // Clean up the database connection after agent processing
      const client = c.get('dbClient')
      if (client) {
        await client.end()
      }
    }
  }
)

export default app
