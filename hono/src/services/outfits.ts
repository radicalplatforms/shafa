import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { itemTypeEnum, itemsToOutfits, outfits, tagsToOutfits } from '../schema'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'

const insertOutfitSchema = createInsertSchema(outfits, {
  rating: z.number().min(0).max(2).default(1),
  wearDate: z.coerce.date(),
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
      where: eq(outfits.userId, userId),
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
        // Create outfit
        const newOutfit = (
          await tx
            .insert(outfits)
            .values({
              ...body,
              userId,
            })
            .onConflictDoNothing()
            .returning()
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
          await tx.insert(tagsToOutfits).values(
            body.tagIds.map((e) => ({
              tagId: e,
              outfitId: newOutfit.id,
              status: 'manually_assigned',
            }))
          )
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

    // STEP 1: Get all items with last worn dates in a single query
    const allItems = await c.get('db').query.items.findMany({
      where: eq(sql`items.user_id`, userId),
      columns: {
        id: true,
        type: true,
        rating: true,
      },
    })

    // Calculate recency threshold (min count of items per category)
    const wardrobeCounts = {
      total: allItems.length,
      layer: allItems.filter((i) => i.type === 'layer').length,
      top: allItems.filter((i) => i.type === 'top').length,
      bottom: allItems.filter((i) => i.type === 'bottom').length,
      footwear: allItems.filter((i) => i.type === 'footwear').length,
    }

    const recencyThreshold =
      Math.min(
        wardrobeCounts.layer || 0,
        wardrobeCounts.top || 0,
        wardrobeCounts.bottom || 0,
        wardrobeCounts.footwear || 0
      ) || 7 // Default to 7 days

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

      if (!lastWornDate) {
        // Item never worn - maximum freshness
        itemFreshnessMap.set(item.id, 1.0)
        continue
      }

      const daysSinceWorn = Math.floor(
        (today.getTime() - new Date(lastWornDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Parameters that control the curve shape
      const minFreshness = 0.05 // Minimum freshness for very recently worn items
      const maxFreshness = 1.0 // Maximum freshness
      const risePhase = recencyThreshold // Days it takes to reach peak freshness
      const plateauPhase = 30 // Days the freshness stays at peak
      const degradationRate = 0.005 // How quickly freshness decreases after plateau (per day)

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

    // If no eligible outfits, return empty result
    if (eligibleOutfits.length === 0) {
      return c.json({
        suggestions: [],
        generated_at: today,
        metadata: {
          wardrobe_size: allItems.length,
          recency_threshold: recencyThreshold,
          last_page: true,
          algorithm_version: 'v2',
        },
      })
    }

    // Filter outfits to only include those with at least one layer/top, one bottom, and one footwear
    // And apply tag filter if provided
    const completeOutfits = eligibleOutfits.filter((outfit) => {
      const hasTopOrLayer = outfit.itemsToOutfits.some(
        (io) => io.itemType === 'top' || io.itemType === 'layer'
      )
      const hasBottom = outfit.itemsToOutfits.some((io) => io.itemType === 'bottom')
      const hasFootwear = outfit.itemsToOutfits.some((io) => io.itemType === 'footwear')

      // If tagId is provided, check if the outfit has this tag
      const hasTag = !tagId || outfit.tagsToOutfits.some((to) => to.tagId === tagId)

      return hasTopOrLayer && hasBottom && hasFootwear && hasTag
    })

    // If no complete outfits after filtering, return empty result
    if (completeOutfits.length === 0) {
      return c.json({
        suggestions: [],
        generated_at: today,
        metadata: {
          wardrobe_size: allItems.length,
          recency_threshold: recencyThreshold,
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
        if (new Date(outfit.wearDate) > new Date(currentMostRecent.wearDate)) {
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
      const daysSinceWorn = Math.floor(
        (today.getTime() - new Date(outfit.wearDate).getTime()) / (1000 * 60 * 60 * 24)
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
              typeWeightedFreshness: 1.0,
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

      // NEW: Calculate type-weighted freshness
      const typeWeightedFreshness = () => {
        // Group outfit items by type and calculate average freshness per type
        interface TypeGroup {
          items: string[]
          totalFreshness: number
          count: number
        }

        const typeGroups: Record<string, TypeGroup> = {}
        let totalWeight = 0
        let weightedSum = 0

        // Group items by type and calculate average freshness per type
        for (const io of outfit.itemsToOutfits) {
          if (!typeGroups[io.itemType]) {
            typeGroups[io.itemType] = {
              items: [],
              totalFreshness: 0,
              count: 0,
            }
          }

          const freshness = itemFreshnessMap.get(io.itemId) || 1.0
          typeGroups[io.itemType].items.push(io.itemId)
          typeGroups[io.itemType].totalFreshness += freshness
          typeGroups[io.itemType].count++
        }

        // Calculate inverse wardrobe weights (fewer items = less weight on low freshness)
        // This means types with fewer items will penalize the score less
        const totalItemsInWardrobe = wardrobeCounts.total || 1
        const typeWeights: Record<string, number> = {
          layer: Math.log(1 + (wardrobeCounts.layer || 1)) / Math.log(1 + totalItemsInWardrobe),
          top: Math.log(1 + (wardrobeCounts.top || 1)) / Math.log(1 + totalItemsInWardrobe),
          bottom: Math.log(1 + (wardrobeCounts.bottom || 1)) / Math.log(1 + totalItemsInWardrobe),
          footwear:
            Math.log(1 + (wardrobeCounts.footwear || 1)) / Math.log(1 + totalItemsInWardrobe),
          accessory: 0.05, // Fixed low weight for accessories
        }

        // Calculate weighted freshness scores
        for (const [type, group] of Object.entries(typeGroups)) {
          if (group.count === 0) continue

          const typeFreshness = group.totalFreshness / group.count
          const typeWeight = typeWeights[type] || 0.1 // default weight if type is unknown

          weightedSum += typeFreshness * typeWeight
          totalWeight += typeWeight
        }

        // Return the weighted average freshness
        return totalWeight > 0 ? weightedSum / totalWeight : avgFreshness
      }

      const typeWeightedFreshnessScore = typeWeightedFreshness()

      // Calculate outfit freshness using a combined approach:
      // - 50% weight to type-weighted freshness (accounts for wardrobe proportions)
      // - 30% weight to average freshness (overall outfit freshness)
      // - 20% weight to minimum freshness (still penalizes very recently worn items, but less severely)
      const outfitFreshness =
        0.5 * typeWeightedFreshnessScore + 0.3 * avgFreshness + 0.2 * minFreshness

      // Additional penalty for multiple recently worn items (freshness < 0.4)
      // Each additional recently worn item adds a 15% penalty
      const recentlyWornPenaltyFactor = Math.max(0, recentlyWornCount - 1) * 0.15

      // Final freshness is scaled by the penalty factor
      const finalFreshness = Math.max(0, outfitFreshness * (1 - recentlyWornPenaltyFactor))

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
            typeWeightedFreshness: typeWeightedFreshnessScore.toFixed(3),
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
    const sortedOutfits = scoredOutfits.sort((a, b) => b.totalScore - a.totalScore)
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

        return {
          ...outfit,
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
              typeWeightedFreshness: 1.0,
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
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore
        }
        return (
          Number(b.scoringDetails.rawData.avgItemFreshness || 0) -
          Number(a.scoringDetails.rawData.avgItemFreshness || 0)
        )
      })

    // Return the final result
    return c.json({
      suggestions: outfitsWithScores,
      generated_at: today,
      metadata: {
        wardrobe_size: allItems.length,
        recency_threshold: recencyThreshold,
        last_page,
        algorithm_version: 'v2',
        filter_applied: tagId ? 'tag_filter' : 'complete_outfits_only',
        tagId: tagId || undefined,
      },
    })
  })

export default app
