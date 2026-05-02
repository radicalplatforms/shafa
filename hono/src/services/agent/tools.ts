import { tool } from 'ai'
import { z } from 'zod'

import { itemStatusEnum, itemTypeEnum } from '../../schema'
import type { ItemService } from '../ItemService'
import type { OutfitService } from '../OutfitService'

export interface ToolContext {
  userId: string
  itemService: ItemService
  outfitService: OutfitService
}

const itemTypeEnumZ = z.enum(itemTypeEnum as [string, ...string[]])
const itemStatusEnumZ = z.enum(itemStatusEnum as [string, ...string[]])
const outfitRatingEnumZ = z.enum(['0', '1', '2'])

export function createTools(context: ToolContext) {
  console.log('[TOOLS] Creating tools for user:', context.userId)

  const searchItemsSchema = z
    .object({
      text: z
        .string()
        .optional()
        .describe('Free text search across name and brand'),
      itemIdsAny: z
        .array(z.string())
        .optional()
        .describe('Match any of these item IDs'),
      nameEquals: z.string().optional().describe('Exact name match'),
      brandEquals: z.string().optional().describe('Exact brand match'),
      typeIn: z.array(itemTypeEnumZ).optional().describe('Filter by item types'),
      statusIn: z
        .array(itemStatusEnumZ)
        .optional()
        .describe('Filter by item status'),
      createdFrom: z
        .string()
        .optional()
        .describe('Created on or after (ISO timestamp)'),
      createdTo: z.string().optional().describe('Created before (ISO timestamp)'),
      inOutfitsOnly: z
        .coerce.boolean()
        .optional()
        .describe('Only items that appear in outfits'),
      neverWorn: z
        .coerce.boolean()
        .optional()
        .describe('Only items never worn'),
      wornWithItemId: z
        .string()
        .optional()
        .describe('Items co-worn with this item'),
      wornBetween: z
        .object({
          startDate: z.string().describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().describe('End date (YYYY-MM-DD)'),
        })
        .optional()
        .describe('Outfits worn in this date range'),
      taggedWithAllTagIds: z
        .array(z.string())
        .optional()
        .describe('Items in outfits with ALL these tag IDs'),
      taggedWithAnyTagIds: z
        .array(z.string())
        .optional()
        .describe('Items in outfits with ANY of these tag IDs'),
      taggedWithAllTagNames: z
        .array(z.string())
        .optional()
        .describe('Items in outfits with ALL these tag names'),
      taggedWithAnyTagNames: z
        .array(z.string())
        .optional()
        .describe('Items in outfits with ANY of these tag names'),
      sortBy: z
        .enum(['createdAt', 'name', 'brand', 'wornCount'])
        .optional()
        .describe('Sort field'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.coerce.number().optional().describe('Maximum results'),
      cursor: z.string().optional().describe('Pagination cursor'),
    })
    .transform((data) => {
      const { wornBetween, ...rest } = data
      if (
        wornBetween &&
        typeof wornBetween === 'object' &&
        Object.keys(wornBetween).length === 0
      ) {
        return rest
      }
      return data as typeof rest & { wornBetween?: { startDate: string; endDate: string } }
    })

  const search_items = tool({
    description:
      'Search wardrobe items with comprehensive filters. Supports text search, exact matches, type/status filters, usage patterns, tag filters, and sorting.',
    inputSchema: searchItemsSchema,
    execute: async (input) => {
      console.log(
        '[TOOLS] search_items called with input:',
        JSON.stringify(input, null, 2)
      )
      console.log('[TOOLS] Thinking: Searching through your wardrobe items...')
      const result = await context.itemService.searchItems(
        context.userId,
        input
      )
      console.log('[TOOLS] search_items result count:', result.length || 0)
      return result
    },
  })

  const searchOutfitsSchema = z
    .object({
      text: z
        .string()
        .optional()
        .describe('Free text across tag names, item names, and brands'),
      tagIdsAny: z
        .array(z.string())
        .optional()
        .describe('Outfits with ANY of these tag IDs'),
      tagNamesAny: z
        .array(z.string())
        .optional()
        .describe('Outfits with ANY of these tag names'),
      tagIdsAll: z
        .array(z.string())
        .optional()
        .describe('Outfits with ALL of these tag IDs'),
      tagNamesAll: z
        .array(z.string())
        .optional()
        .describe('Outfits with ALL of these tag names'),
      containsItemId: z
        .string()
        .optional()
        .describe('Outfits containing this item'),
      minRating: outfitRatingEnumZ.optional().describe('Minimum rating'),
      ratingIn: z
        .array(outfitRatingEnumZ)
        .optional()
        .describe('Filter by specific ratings'),
      wearDateBetween: z
        .object({
          startDate: z.string().describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().describe('End date (YYYY-MM-DD)'),
        })
        .optional()
        .describe('Worn in this date range'),
      withItems: z
        .coerce.boolean()
        .optional()
        .describe('Include items in response'),
      sortBy: z.enum(['wearDate', 'rating']).optional().describe('Sort field'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.coerce.number().optional().describe('Maximum results'),
      cursor: z.string().optional().describe('Pagination cursor'),
    })
    .transform((data) => {
      const { wearDateBetween, ...rest } = data
      if (
        wearDateBetween &&
        typeof wearDateBetween === 'object' &&
        Object.keys(wearDateBetween).length === 0
      ) {
        return rest
      }
      return data as typeof rest & { wearDateBetween?: { startDate: string; endDate: string } }
    })

  const search_outfits = tool({
    description:
      'Search outfits with comprehensive filters. Supports text search, tag filters (ANY/ALL), item composition, rating, wear dates, and sorting. Can include items to avoid second request.',
    inputSchema: searchOutfitsSchema,
    execute: async (input) => {
      console.log(
        '[TOOLS] search_outfits called with input:',
        JSON.stringify(input, null, 2)
      )
      console.log('[TOOLS] Thinking: Looking through your outfit history...')

      // If no limit specified, default to a reasonable number to match API behavior
      const searchInput = {
        ...input,
        limit: input.limit || 10, // Default to 10 like the API
      }

      const result = await context.outfitService.searchOutfits(
        context.userId,
        searchInput
      )
      console.log('[TOOLS] search_outfits result count:', result.length || 0)
      console.log(
        '[TOOLS] search_outfits result IDs:',
        result.map((r) => r.id)
      )
      return result
    },
  })

  const get_outfit_items = tool({
    description: 'Fetch items that compose a specific outfit',
    inputSchema: z.object({
      outfitId: z.string().describe('The outfit ID'),
    }),
    execute: async (input) => {
      console.log(
        '[TOOLS] get_outfit_items called with outfitId:',
        input.outfitId
      )
      console.log('[TOOLS] Thinking: Examining outfit composition...')

      const result = await context.outfitService.getOutfitItems(
        context.userId,
        input.outfitId
      )
      console.log('[TOOLS] get_outfit_items result count:', result.length || 0)

      if (result.length === 0) {
        console.warn(
          '[TOOLS] get_outfit_items - no items found, outfit may not exist:',
          input.outfitId
        )
        return {
          error: 'Outfit not found or has no items',
          outfitId: input.outfitId,
        }
      }

      return result
    },
  })

  const buildOutfitSchema = z.object({
    seedItemId: z
      .string()
      .optional()
      .describe('Anchor item to build outfit around'),
    tagIdsPreferred: z
      .array(z.string())
      .optional()
      .describe('Preferred tag IDs for the outfit'),
    tagNamesPreferred: z
      .array(z.string())
      .optional()
      .describe('Preferred tag names for the outfit'),
    requiredTypes: z
      .array(itemTypeEnumZ)
      .optional()
      .describe('Required item types (default: top, bottom, footwear)'),
    excludeItemIds: z
      .array(z.string())
      .optional()
      .describe('Never include these items'),
    pinnedItemIds: z
      .array(z.string())
      .optional()
      .describe('Must include these items'),
    climate: z
      .enum(['cold', 'cool', 'mild', 'warm', 'hot'])
      .optional()
      .describe('Climate hint'),
    preferReuseBottoms: z
      .coerce.boolean()
      .optional()
      .describe('Prefer reusing bottoms'),
    preferReuseFootwear: z
      .coerce.boolean()
      .optional()
      .describe('Prefer reusing footwear'),
  })

  const build_outfit = tool({
    description:
      'Build a single outfit suggestion from available items. Respects constraints like required types, pinned items, exclusions, and climate preferences.',
    inputSchema: buildOutfitSchema,
    execute: async (input) => {
      console.log(
        '[TOOLS] build_outfit called with input:',
        JSON.stringify(input, null, 2)
      )
      console.log('[TOOLS] Thinking: Creating outfit combinations...')
      const result = await context.outfitService.buildOutfit(
        context.userId,
        input
      )
      console.log(
        '[TOOLS] build_outfit result:',
        result.message ? 'success' : 'failed'
      )
      return result
    },
  })

  const rankOutfitsSchema = z.object({
    candidates: z
      .array(
        z.object({
          items: z.array(
            z.object({
              itemId: z.string(),
              itemType: itemTypeEnumZ,
            })
          ),
        })
      )
      .describe('Candidate outfits to rank'),
    climate: z
      .enum(['cold', 'cool', 'mild', 'warm', 'hot'])
      .optional()
      .describe('Climate context'),
    tagPreferences: z
      .array(z.string())
      .optional()
      .describe('Preferred tags for ranking'),
  })

  const rank_outfits = tool({
    description:
      'Rank multiple candidate outfits by scoring favorites, compatibility, climate fit, and rewear frequency. Returns scored results sorted high to low.',
    inputSchema: rankOutfitsSchema,
    execute: async (input) => {
      console.log(
        '[TOOLS] rank_outfits called with candidates count:',
        input.candidates?.length || 0
      )
      const result = await context.outfitService.rankOutfits(
        context.userId,
        input
      )
      console.log('[TOOLS] rank_outfits result count:', result.length || 0)
      return result
    },
  })


  const validate_outfit_id = tool({
    description:
      "Validate that an outfit ID exists in the user's wardrobe before referencing it",
    inputSchema: z.object({
      outfitId: z.string().describe('The outfit ID to validate'),
    }),
    execute: async (input) => {
      console.log(
        '[TOOLS] validate_outfit_id called with outfitId:',
        input.outfitId
      )

      const exists = await context.outfitService.outfitExists(
        context.userId,
        input.outfitId
      )

      if (!exists) {
        console.warn(
          '[TOOLS] validate_outfit_id - outfit not found:',
          input.outfitId
        )
        return {
          exists: false,
          outfitId: input.outfitId,
          error: "Outfit not found in user's wardrobe",
        }
      }

      console.log('[TOOLS] validate_outfit_id - outfit found:', input.outfitId)
      return {
        exists: true,
        outfitId: input.outfitId,
      }
    },
  })

  const get_available_outfit_ids = tool({
    description:
      "Get all available outfit IDs in the user's wardrobe for reference",
    inputSchema: z.object({}),
    execute: async (input) => {
      console.log('[TOOLS] get_available_outfit_ids called')

      const outfits = await context.outfitService.searchOutfits(
        context.userId,
        {
          pagination: { offset: 0, limit: 1000 }, // Get all outfits
        }
      )

      const outfitIds = outfits.map((o) => o.id)
      console.log(
        '[TOOLS] get_available_outfit_ids result count:',
        outfitIds.length
      )
      console.log('[TOOLS] get_available_outfit_ids result IDs:', outfitIds)

      return {
        outfitIds,
        count: outfitIds.length,
      }
    },
  })

  console.log('[TOOLS] Tools created successfully for user:', context.userId)

  return {
    search_items,
    search_outfits,
    get_outfit_items,
    build_outfit,
    rank_outfits,
    validate_outfit_id,
    get_available_outfit_ids,
  }
}

export type ToolSet = ReturnType<typeof createTools>
