import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { itemTypeEnum, items, itemsToOutfits, outfits, tagsToOutfits } from '../schema'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'
import { VIRTUAL_TAGS, getApplicableVirtualTags, isVirtualTag } from './tags'

const insertOutfitSchema = createInsertSchema(outfits, {
  rating: z.number().min(0).max(2).default(1),
  wearDate: z.coerce.date().optional(),
})
  .extend({
    itemIdsTypes: z
      .array(
        z.object({
          id: z.string().refine((val) => isCuid(val)),
          itemType: z.enum(itemTypeEnum),
        })
      )
      .min(1)
      .max(8),
    tagIds: z.array(z.string()).max(8),
  })
  .omit({ id: true, userId: true })

const selectOutfitSchema = createSelectSchema(outfits, {
  id: z.string().refine((val) => isCuid(val)),
})

const paginationValidationOutfits = z.object({
  page: z
    .string()
    .refine((val) => !isNaN(+val) && +val >= 0, {
      message: 'Outfits page number must be a non-negative number',
    })
    .optional(),
  size: z
    .string()
    .refine((val) => !isNaN(+val) && +val > 0 && +val <= 100, {
      message: 'Outfits page size must be a positive number and less than or equal to 100',
    })
    .optional(),
})

const suggestionsValidation = z.object({
  page: z
    .string()
    .refine((val) => !isNaN(+val) && +val >= 0, {
      message: 'Suggestions page number must be a non-negative number',
    })
    .optional(),
  size: z
    .string()
    .refine((val) => !isNaN(+val) && +val > 0 && +val <= 100, {
      message: 'Suggestions page size must be a positive number and less than or equal to 100',
    })
    .optional(),
  tagId: z.string().optional(),
})

const app = new Hono<{ Variables: AuthVariables & DBVariables }>()
  .get('/', zValidator('query', paginationValidationOutfits), requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const { page, size } = c.req.query()

    const pageNumber: number = page ? +page : 0
    const pageSize: number = size ? +size : 10

    const outfitsData = await c.get('db').query.outfits.findMany({
      where: and(
        eq(outfits.userId, userId),
        sql`${outfits.wearDate} IS NOT NULL` // Exclude ghost outfits
      ),
      with: {
        itemsToOutfits: {
          columns: {
            outfitId: false,
          },
          orderBy: (itemsToOutfits, { asc }) => [asc(itemsToOutfits.itemType)],
        },
        tagsToOutfits: {
          columns: {
            outfitId: false,
          },
        },
      },
      orderBy: (outfits, { desc }) => [desc(outfits.wearDate)],
      offset: pageNumber * pageSize,
      limit: pageSize + 1,
    })

    const last_page = !(outfitsData.length > pageSize)
    if (!last_page) outfitsData.pop()

    return c.json({
      outfits: outfitsData,
      last_page: last_page,
    })
  })
  .post('/', zValidator('json', insertOutfitSchema), requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const body = c.req.valid('json')

    return c.json(
      await c.get('db').transaction(async (tx) => {
        // Check if any of the items being used are archived
        const itemIds = body.itemIdsTypes.map((e) => e.id)

        if (itemIds.length > 0) {
          // Find which of these items (if any) are currently archived
          const archivedItems = await tx.query.items.findMany({
            where: and(
              inArray(items.id, itemIds),
              eq(items.isArchived, true),
              eq(items.userId, userId)
            ),
            columns: {
              id: true,
            },
          })

          // If any archived items were found, unarchive them
          if (archivedItems.length > 0) {
            const archivedItemIds = archivedItems.map((item) => item.id)

            // Unarchive the items
            await tx
              .update(items)
              .set({ isArchived: false })
              .where(inArray(items.id, archivedItemIds))
          }
        }

        const outfitData = {
          ...body,
          userId,
        }

        const newOutfit = (
          await tx.insert(outfits).values(outfitData).onConflictDoNothing().returning()
        )[0]

        // Insert item to outfit relationships
        await tx.insert(itemsToOutfits).values(
          body.itemIdsTypes.map((e) => ({
            itemId: e.id,
            outfitId: newOutfit.id,
            itemType: e.itemType,
          }))
        )

        // Insert tag to outfit relationships
        if (body.tagIds.length > 0) {
          // Filter out virtual tags
          const realTagIds = body.tagIds.filter((tagId) => !isVirtualTag(tagId))

          if (realTagIds.length > 0) {
            await tx.insert(tagsToOutfits).values(
              realTagIds.map((e) => ({
                tagId: e,
                outfitId: newOutfit.id,
                status: 'manually_assigned',
              }))
            )
          }
        }

        return newOutfit
      })
    )
  })
  .delete(
    '/:id',
    zValidator('param', selectOutfitSchema.pick({ id: true })),
    requireAuth,
    injectDB,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')

      return c.json(
        (
          await c
            .get('db')
            .delete(outfits)
            .where(and(eq(outfits.id, params.id), eq(outfits.userId, userId)))
            .returning()
        )[0]
      )
    }
  )
  .get('/suggest', zValidator('query', suggestionsValidation), requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const { page, size, tagId } = c.req.query()
    const pageNumber: number = page ? +page : 0
    const pageSize: number = size ? +size : 10
    const today = new Date()

    // Handle filtering by virtual tags
    const isVirtualTagFilter = tagId ? isVirtualTag(tagId) : false
    const virtualTag = isVirtualTagFilter ? VIRTUAL_TAGS[tagId!] : undefined
    const regularTagId = isVirtualTagFilter ? undefined : tagId

    // STEP 1: Get all non-archived items with last worn dates in a single query
    const allItems = await c.get('db').query.items.findMany({
      where: and(
        eq(sql`items.user_id`, userId),
        eq(items.isArchived, false) // Exclude archived items from suggestions
      ),
      columns: {
        id: true,
        type: true,
        rating: true,
      },
    })

    // Get a list of archived item IDs for checking if outfits contain archived items
    const archivedItems = await c.get('db').query.items.findMany({
      where: and(eq(sql`items.user_id`, userId), eq(items.isArchived, true)),
      columns: {
        id: true,
      },
    })

    // Create a Set of archived item IDs for efficient lookup
    const archivedItemIds = new Set(archivedItems.map((item) => item.id))

    // Calculate recency threshold (min count of items per category)
    const wardrobeCounts = {
      total: allItems.length,
      layer: allItems.filter((i) => i.type === 'layer').length,
      top: allItems.filter((i) => i.type === 'top').length,
      bottom: allItems.filter((i) => i.type === 'bottom').length,
      footwear: allItems.filter((i) => i.type === 'footwear').length,
      accessory: allItems.filter((i) => i.type === 'accessory').length,
    }

    // Global minimum threshold for very small wardrobes
    const minRecencyThreshold = 3

    // Multiplier for the threshold
    const thresholdMultiplier = 0.75

    // Calculate type-specific recency thresholds
    const recencyThresholds = {
      layer: Math.max(wardrobeCounts.layer * thresholdMultiplier || 7, minRecencyThreshold),
      top: Math.max(wardrobeCounts.top * thresholdMultiplier || 7, minRecencyThreshold),
      bottom: Math.max(wardrobeCounts.bottom * thresholdMultiplier || 7, minRecencyThreshold),
      footwear: Math.max(wardrobeCounts.footwear * thresholdMultiplier || 7, minRecencyThreshold),
      accessory: Math.max(wardrobeCounts.accessory * thresholdMultiplier || 7, minRecencyThreshold),
      default: 7, // Default threshold for unknown types
    }

    // STEP 2: Get the last worn date for each item in a single query
    const itemLastWorn = await c.get('db').execute(
      sql`
        SELECT 
          io.item_id,
          MAX(o.wear_date) as last_worn_date
        FROM 
          items_to_outfits io
        JOIN 
          outfits o ON o.id = io.outfit_id
        WHERE 
          o.user_id = ${userId}
        GROUP BY 
          io.item_id
      `
    )

    // Create a map of item ID to last worn date
    const itemLastWornMap = new Map()
    for (const row of itemLastWorn.rows || []) {
      itemLastWornMap.set(row.item_id, row.last_worn_date)
    }

    // Calculate freshness factor for each item (0.1 to 1.0)
    const itemFreshnessMap = new Map()
    for (const item of allItems) {
      const lastWornDate = itemLastWornMap.get(item.id)
      const itemType = item.type as keyof typeof recencyThresholds

      // Use type-specific recency threshold
      const typeRecencyThreshold = recencyThresholds[itemType] || recencyThresholds.default

      if (!lastWornDate) {
        // Item never worn - maximum freshness
        itemFreshnessMap.set(item.id, 1.0)
        continue
      }

      const daysSinceWorn = Math.floor(
        (today.getTime() - new Date(lastWornDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Parameters that control the curve shape
      const minFreshness = 0.01 // Minimum freshness for very recently worn items
      const maxFreshness = 1.0 // Maximum freshness
      const risePhase = typeRecencyThreshold // Days it takes to reach peak freshness - now type-specific
      const plateauPhase = typeRecencyThreshold // Days the freshness stays at peak
      const degradationRate = 0.05 // How quickly freshness decreases after plateau (per day)

      let freshnessFactor
      if (daysSinceWorn <= 0) {
        // Just worn today
        freshnessFactor = minFreshness
      } else if (daysSinceWorn < risePhase) {
        // S-curve using logistic function for rising phase
        // Has flat beginning and gradual approach to peak
        const progress = daysSinceWorn / risePhase

        // Logistic function parameters
        const steepness = 7.0 // Slightly reduced steepness for a more gradual curve
        const midpoint = 0.7 // Shifted further right to extend the flat beginning

        // Logistic function: 1 / (1 + e^(-steepness * (x - midpoint)))
        const logisticValue = 1 / (1 + Math.exp(-steepness * (progress - midpoint)))

        // Normalize to ensure we start at minFreshness and end exactly at maxFreshness
        // We need to calculate what the logistic function outputs at progress=0 and progress=1
        const startValue = 1 / (1 + Math.exp(-steepness * (0 - midpoint)))
        const endValue = 1 / (1 + Math.exp(-steepness * (1 - midpoint)))

        // Normalize the output
        const normalizedValue = (logisticValue - startValue) / (endValue - startValue)

        freshnessFactor = minFreshness + (maxFreshness - minFreshness) * normalizedValue
      } else if (daysSinceWorn < risePhase + plateauPhase) {
        // Plateau phase: maintain maximum freshness
        freshnessFactor = maxFreshness
      } else {
        // Linear degradation phase
        const daysAfterPlateau = daysSinceWorn - (risePhase + plateauPhase)
        const degradation = daysAfterPlateau * degradationRate
        freshnessFactor = Math.max(minFreshness, maxFreshness - degradation)
      }

      itemFreshnessMap.set(item.id, freshnessFactor)
    }

    // STEP 3: Get all eligible outfits in a single query
    const eligibleOutfits = await c.get('db').query.outfits.findMany({
      where: and(eq(outfits.userId, userId), gte(outfits.rating, 1)),
      with: {
        itemsToOutfits: {
          columns: {
            outfitId: true,
            itemId: true,
            itemType: true,
          },
        },
        tagsToOutfits: {
          columns: {
            outfitId: true,
            tagId: true,
            status: true,
          },
        },
      },
      orderBy: (outfits, { desc }) => [desc(outfits.wearDate)],
    })

    // Filter out outfits that contain any archived items
    const nonArchivedOutfits = eligibleOutfits.filter((outfit) => {
      // Return true only if no items in the outfit are archived
      return !outfit.itemsToOutfits.some((io) => archivedItemIds.has(io.itemId))
    })

    // If no eligible outfits after filtering archived items, return empty result
    if (nonArchivedOutfits.length === 0) {
      return c.json({
        suggestions: [],
        generated_at: today,
        metadata: {
          wardrobe_size: allItems.length,
          recency_threshold: recencyThresholds,
          last_page: true,
          algorithm_version: 'v2',
          filter_applied: 'no_eligible_outfits_or_all_contain_archived_items',
        },
      })
    }

    // Filter outfits to only include those with at least one layer/top, one bottom, and one footwear
    // And apply tag filter if provided
    const completeOutfits = nonArchivedOutfits.filter((outfit) => {
      const hasTopOrLayer = outfit.itemsToOutfits.some(
        (io) => io.itemType === 'top' || io.itemType === 'layer'
      )
      const hasBottom = outfit.itemsToOutfits.some((io) => io.itemType === 'bottom')
      const hasFootwear = outfit.itemsToOutfits.some((io) => io.itemType === 'footwear')

      // Check for virtual tag filter
      const matchesVirtualTagFilter =
        !virtualTag || (virtualTag.appliesTo && virtualTag.appliesTo(outfit))

      // If regular tagId is provided, check if the outfit has this tag
      const hasTag = !regularTagId || outfit.tagsToOutfits.some((to) => to.tagId === regularTagId)

      return hasTopOrLayer && hasBottom && hasFootwear && hasTag && matchesVirtualTagFilter
    })

    // If no complete outfits after filtering, return empty result
    if (completeOutfits.length === 0) {
      return c.json({
        suggestions: [],
        generated_at: today,
        metadata: {
          wardrobe_size: allItems.length,
          recency_threshold: recencyThresholds,
          last_page: true,
          algorithm_version: 'v2',
          filter_applied: 'complete_outfits_only',
        },
      })
    }

    // STEP 4: Filter out outfits with identical core items, keeping only the most recent
    // Track outfits with the same core items (layers, tops, bottoms only)
    const coreItemsMap = new Map()
    const mostRecentByCoreItems = new Map()

    // First pass: Group outfits by core items and find the most recent for each group
    for (const outfit of completeOutfits) {
      // Extract only layers, tops, and bottoms - not accessories or footwear
      const coreItems = outfit.itemsToOutfits
        .filter((io) => ['layer', 'top', 'bottom'].includes(io.itemType))
        .map((io) => io.itemId)
        .sort() // Sort to ensure consistent order

      // Skip if no core items
      if (coreItems.length === 0) continue

      // Create a key for this combination of core items
      const coreItemsKey = coreItems.join('|')

      // Add this outfit to the map of outfits with these core items
      if (!coreItemsMap.has(coreItemsKey)) {
        coreItemsMap.set(coreItemsKey, [outfit])
        mostRecentByCoreItems.set(coreItemsKey, outfit)
      } else {
        coreItemsMap.get(coreItemsKey).push(outfit)

        // Check if this outfit is more recent than the currently stored one
        const currentMostRecent = mostRecentByCoreItems.get(coreItemsKey)
        const outfitDate = outfit.wearDate ? new Date(outfit.wearDate) : new Date(0)
        const currentMostRecentDate = currentMostRecent.wearDate
          ? new Date(currentMostRecent.wearDate)
          : new Date(0)
        if (outfitDate > currentMostRecentDate) {
          mostRecentByCoreItems.set(coreItemsKey, outfit)
        }
      }
    }

    // Second pass: Filter outfits to keep only the most recent for each core items group
    const uniqueOutfits = completeOutfits.filter((outfit) => {
      const coreItems = outfit.itemsToOutfits
        .filter((io) => ['layer', 'top', 'bottom'].includes(io.itemType))
        .map((io) => io.itemId)
        .sort()

      // If this outfit has no core items, keep it (it's unique)
      if (coreItems.length === 0) return true

      const coreItemsKey = coreItems.join('|')
      const mostRecent = mostRecentByCoreItems.get(coreItemsKey)

      // Keep this outfit only if it's the most recent one with these core items
      return outfit.id === mostRecent.id
    })

    // Calculate wear counts for the filtered outfits
    const wearCountsMap = new Map()

    // For each filtered outfit, set its wear count to the total number of outfits with the same core items
    for (const outfit of uniqueOutfits) {
      const coreItems = outfit.itemsToOutfits
        .filter((io) => ['layer', 'top', 'bottom'].includes(io.itemType))
        .map((io) => io.itemId)
        .sort()

      if (coreItems.length === 0) {
        wearCountsMap.set(outfit.id, 1) // Unique outfit
        continue
      }

      const coreItemsKey = coreItems.join('|')
      const totalWithSameCoreItems = coreItemsMap.get(coreItemsKey)?.length || 1

      // Set wear count to the total number of times this combination has been worn
      wearCountsMap.set(outfit.id, totalWithSameCoreItems)
    }

    // STEP 5: Score each outfit
    const scoredOutfits = uniqueOutfits.map((outfit) => {
      // Rating Score (0-10)
      const ratingScore = outfit.rating === 2 ? 10 : 3 // Rating 1 = 3, Rating 2 = 10

      // Time Score (0-30)
      const outfitDate = outfit.wearDate ? new Date(outfit.wearDate) : new Date(0)
      const daysSinceWorn = Math.floor(
        (today.getTime() - outfitDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Get item freshness for all items in this outfit
      const itemIds = outfit.itemsToOutfits.map((io) => io.itemId)
      const nonAccessoryItems = outfit.itemsToOutfits.filter((io) => io.itemType !== 'accessory')

      if (itemIds.length === 0) {
        // Empty outfit case - just return rating score
        return {
          outfitId: outfit.id,
          totalScore: ratingScore,
          scoring_details: {
            ratingScore,
            timeScore: 0,
            frequencyScore: 0,
            rawData: {
              daysSinceWorn,
              itemCount: 0,
              nonAccessoryItemCount: 0,
              wearCount: 1,
              avgItemFreshness: 0,
              minItemFreshness: 1.0,
              recentlyWornItems: 0,
              outfitFreshness: 1.0,
              wardrobeRatios: {
                layer: (wardrobeCounts.layer || 0) / wardrobeCounts.total,
                top: (wardrobeCounts.top || 0) / wardrobeCounts.total,
                bottom: (wardrobeCounts.bottom || 0) / wardrobeCounts.total,
                footwear: (wardrobeCounts.footwear || 0) / wardrobeCounts.total,
              },
            },
          },
        }
      }

      // Calculate average freshness of all items
      let totalFreshness = 0
      let minFreshness = 1.0
      let recentlyWornCount = 0

      for (const itemId of itemIds) {
        const itemFreshness = itemFreshnessMap.get(itemId) || 1.0
        totalFreshness += itemFreshness

        // Track minimum freshness to penalize very recently worn items
        minFreshness = Math.min(minFreshness, itemFreshness)

        // Count recently worn items (freshness < 0.4)
        if (itemFreshness < 0.4) {
          recentlyWornCount++
        }
      }

      const avgFreshness = totalFreshness / itemIds.length

      // Amplify the impact of low freshness items using a power function
      // This will reduce scores more severely when freshness is low
      const amplifiedMinFreshness = Math.pow(minFreshness, 1.5)

      // Calculate outfit freshness using a modified approach that emphasizes minimum freshness:
      // - 60% weight to average freshness (overall outfit freshness)
      // - 40% weight to amplified minimum freshness (significantly penalizes very recently worn items)
      const finalFreshness = 0.6 * avgFreshness + 0.4 * amplifiedMinFreshness

      // Time Score (0-40) based directly on finalFreshness
      const timeScore = Math.round(finalFreshness * 40)

      // Frequency Score (0-10)
      const wearCount = wearCountsMap.get(outfit.id) || 1

      // Simplified frequency score based on wear count
      let frequencyScore = 0
      if (wearCount === 1)
        frequencyScore = 10 // Worn once: maximum score
      else if (wearCount === 2)
        frequencyScore = 7 // Worn twice
      else if (wearCount === 3)
        frequencyScore = 4 // Worn three times
      else if (wearCount === 4) frequencyScore = 2 // Worn four times

      // Total score
      const totalScore = ratingScore + timeScore + frequencyScore

      return {
        outfitId: outfit.id,
        totalScore,
        scoring_details: {
          ratingScore,
          timeScore,
          frequencyScore,
          rawData: {
            daysSinceWorn,
            itemCount: itemIds.length,
            nonAccessoryItemCount: nonAccessoryItems.length,
            wearCount,
            avgItemFreshness: avgFreshness.toFixed(3),
            minItemFreshness: minFreshness.toFixed(3),
            recentlyWornItems: recentlyWornCount,
            outfitFreshness: finalFreshness.toFixed(3),
            wardrobeRatios: {
              layer: (wardrobeCounts.layer || 0) / wardrobeCounts.total,
              top: (wardrobeCounts.top || 0) / wardrobeCounts.total,
              bottom: (wardrobeCounts.bottom || 0) / wardrobeCounts.total,
              footwear: (wardrobeCounts.footwear || 0) / wardrobeCounts.total,
            },
          },
        },
      }
    })

    // STEP 6: Sort by score and paginate
    const sortedOutfits = scoredOutfits.sort((a, b) => {
      // Sort by time score (higher is better)
      if (b.scoring_details.timeScore !== a.scoring_details.timeScore) {
        return b.scoring_details.timeScore - a.scoring_details.timeScore
      }

      // Then by rating score (higher is better)
      if (b.scoring_details.ratingScore !== a.scoring_details.ratingScore) {
        return b.scoring_details.ratingScore - a.scoring_details.ratingScore
      }

      // Then by frequency score (lower is better)
      return a.scoring_details.frequencyScore - b.scoring_details.frequencyScore
    })

    const paginatedOutfits = sortedOutfits.slice(
      pageNumber * pageSize,
      pageNumber * pageSize + pageSize + 1
    )

    // Check for last page
    const last_page = !(paginatedOutfits.length > pageSize)
    if (!last_page) paginatedOutfits.pop()

    // STEP 7: Fetch full details for the paginated outfits in a single query
    const outfitIds = paginatedOutfits.map((o) => o.outfitId)
    const outfitDetails = await c.get('db').query.outfits.findMany({
      where: inArray(outfits.id, outfitIds),
      with: {
        itemsToOutfits: {
          columns: {
            outfitId: false,
          },
          orderBy: (itemsToOutfits, { asc }) => [asc(itemsToOutfits.itemType)],
        },
        tagsToOutfits: {
          columns: {
            outfitId: false,
          },
        },
      },
    })

    // Combine the outfit details with their scores
    const outfitsWithScores = outfitDetails
      .map((outfit) => {
        const scoreInfo = paginatedOutfits.find((s) => s.outfitId === outfit.id)

        // Add freshness score to each item
        const itemsToOutfitsWithFreshness = outfit.itemsToOutfits.map((item) => {
          const freshness = itemFreshnessMap.get(item.itemId) || 1.0
          return {
            ...item,
            freshness: parseFloat(freshness.toFixed(3)),
          }
        })

        // Add applicable virtual tags to the outfit
        const tagsToOutfits = [...outfit.tagsToOutfits]
        const applicableVirtualTags = getApplicableVirtualTags(outfit)

        // Add all applicable virtual tags to this outfit
        for (const virtualTag of applicableVirtualTags) {
          tagsToOutfits.push({
            tagId: virtualTag.id,
            status: 'manually_assigned',
          })
        }

        return {
          ...outfit,
          itemsToOutfits: itemsToOutfitsWithFreshness,
          tagsToOutfits,
          scoringDetails: scoreInfo?.scoring_details || {
            ratingScore: 0,
            timeScore: 0,
            frequencyScore: 0,
            rawData: {
              daysSinceWorn: 0,
              itemCount: 0,
              nonAccessoryItemCount: 0,
              wearCount: 0,
              avgItemFreshness: 0,
              minItemFreshness: 1.0,
              recentlyWornItems: 0,
              outfitFreshness: 1.0,
              wardrobeRatios: {
                layer: (wardrobeCounts.layer || 0) / wardrobeCounts.total,
                top: (wardrobeCounts.top || 0) / wardrobeCounts.total,
                bottom: (wardrobeCounts.bottom || 0) / wardrobeCounts.total,
                footwear: (wardrobeCounts.footwear || 0) / wardrobeCounts.total,
              },
            },
          },
          totalScore: scoreInfo?.totalScore || 0,
        }
      })
      .sort((a, b) => {
        // Sort by time score (higher is better)
        if (b.scoringDetails.timeScore !== a.scoringDetails.timeScore) {
          return b.scoringDetails.timeScore - a.scoringDetails.timeScore
        }

        // Then by rating score (higher is better)
        if (b.scoringDetails.ratingScore !== a.scoringDetails.ratingScore) {
          return b.scoringDetails.ratingScore - a.scoringDetails.ratingScore
        }

        // Then by frequency score (lower is better)
        return a.scoringDetails.frequencyScore - b.scoringDetails.frequencyScore
      })

    // Return the final result
    return c.json({
      suggestions: outfitsWithScores,
      generated_at: today,
      metadata: {
        wardrobe_size: allItems.length,
        recency_threshold: recencyThresholds,
        last_page,
        algorithm_version: 'v2',
        filter_applied: isVirtualTagFilter
          ? 'virtual_tag_filter'
          : regularTagId
            ? 'tag_filter'
            : 'complete_outfits_only',
        virtual_tag_name: isVirtualTagFilter ? VIRTUAL_TAGS[tagId!]?.name : undefined,
        tagId: tagId || undefined,
      },
    })
  })

export default app
