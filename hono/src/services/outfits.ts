import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { eq, inArray, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { itemTypeEnum, itemsToOutfits, outfits } from '../schema'
import type { Variables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'

const app = new Hono<{ Variables: Variables }>()

const insertOutfitSchema = createInsertSchema(outfits, {
  rating: z.number().min(0).max(4).default(2),
  wearDate: z.coerce.date(),
  authorUsername: z.string().default(''),
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
  })
  .omit({ id: true })

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
})

app.get('/', zValidator('query', paginationValidationOutfits), injectDB, async (c) => {
  const { page, size } = c.req.query()

  const pageNumber: number = page ? +page : 0
  const pageSize: number = size ? +size : 10

  const outfitsData = await c.get('db').query.outfits.findMany({
    with: {
      itemsToOutfits: {
        columns: {
          itemId: false,
          outfitId: false,
        },
        with: {
          item: true,
        },
        orderBy: (itemsToOutfits, { asc }) => [asc(itemsToOutfits.itemType)],
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

app.post('/', zValidator('json', insertOutfitSchema), injectDB, async (c) => {
  const body = c.req.valid('json')

  return c.json(
    await c.get('db').transaction(async (tx) => {
      // Create outfit
      const newOutfit = (
        await tx
          .insert(outfits)
          .values({
            ...body,
            authorUsername: 'rak3rman', // TODO: remove and replace with author integration
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

      return newOutfit
    })
  )
})

app.put(
  '/:id',
  zValidator('param', selectOutfitSchema.pick({ id: true })),
  zValidator('json', insertOutfitSchema),
  injectDB,
  async (c) => {
    const params = c.req.valid('param')
    const { itemIdsTypes, ...body } = c.req.valid('json')

    return c.json(
      await c.get('db').transaction(async (tx) => {
        // Update outfit
        const updatedOutfit = (
          await tx
            .update(outfits)
            .set({
              ...body,
              authorUsername: 'rak3rman', // TODO: remove and replace with author integration
            })
            .where(eq(outfits.id, params.id))
            .returning()
        )[0]

        // Delete all item to outfit relationships
        await tx.delete(itemsToOutfits).where(eq(itemsToOutfits.outfitId, params.id))

        // Insert item to outfit relationships
        await tx.insert(itemsToOutfits).values(
          itemIdsTypes.map((e) => ({
            itemId: e.id,
            outfitId: updatedOutfit.id,
            itemType: e.itemType,
          }))
        )

        return updatedOutfit
      })
    )
  }
)

app.delete(
  '/:id',
  zValidator('param', selectOutfitSchema.pick({ id: true })),
  injectDB,
  async (c) => {
    const params = c.req.valid('param')

    return c.json(
      (await c.get('db').delete(outfits).where(eq(outfits.id, params.id)).returning())[0]
    )
  }
)

app.get('/suggest', zValidator('query', suggestionsValidation), injectDB, async (c) => {
  const { page, size } = c.req.query()
  const pageNumber: number = page ? +page : 0
  const pageSize: number = size ? +size : 10
  const today = new Date()

  // Get total number of items in wardrobe
  const wardrobeSize = await c
    .get('db')
    .select({ count: sql<number>`count(*)` })
    .from(sql`items`)
    .then((result) => Number(result[0].count))

  // Calculate minimum days before suggesting an outfit again (3-14 days)
  const recencyThreshold = Math.max(3, Math.min(Math.ceil(wardrobeSize / 20), 14))

  // Fetch outfits with their wear statistics and scoring metrics
  const outfitsWithScores = await c
    .get('db')
    .select({
      id: outfits.id,
      rating: outfits.rating,
      lastWorn: sql`MAX(${outfits.wearDate})::text`,
      wearCount: sql`COUNT(${outfits.wearDate})::integer`,
      daysSinceWorn: sql`EXTRACT(DAY FROM (NOW() - MAX(${outfits.wearDate})))::integer`,
      sameDayOfWeekCount: sql`
        COUNT(CASE 
          WHEN EXTRACT(DOW FROM ${outfits.wearDate}::timestamp) = EXTRACT(DOW FROM NOW()) 
          THEN 1 
        END)::integer
      `,
      seasonalRelevance: sql`
        COUNT(CASE 
          WHEN EXTRACT(MONTH FROM ${outfits.wearDate}::timestamp) 
            BETWEEN EXTRACT(MONTH FROM NOW()) - 1 AND EXTRACT(MONTH FROM NOW()) + 1 
          THEN 1 
        END)::float / NULLIF(COUNT(*), 0)::float
      `,
      coreItems: sql`
        COALESCE(
          ARRAY_AGG(DISTINCT ${itemsToOutfits.itemId}::text)
          FILTER (WHERE ${itemsToOutfits.itemType}::text IN ('layer', 'top', 'bottom')),
          ARRAY[]::text[]
        )
      `,
      recentlyWornItemCount: sql`
        (
          SELECT COUNT(DISTINCT io1.item_id)
          FROM items_to_outfits io1 
          WHERE io1.outfit_id = ${outfits.id}
            AND io1.item_type::text IN ('layer', 'top', 'bottom')
            AND EXISTS (
              SELECT 1
              FROM outfits o2
              JOIN items_to_outfits io2 ON io2.outfit_id = o2.id
              WHERE o2.wear_date > NOW() - make_interval(days => ${recencyThreshold})
                AND io2.item_id = io1.item_id
            )
        )::integer
      `,
      avgItemRating: sql`AVG(items.rating)::float`,
      itemCount: sql`COUNT(DISTINCT items_to_outfits.item_id)::integer`,
    })
    .from(outfits)
    .leftJoin(itemsToOutfits, eq(outfits.id, itemsToOutfits.outfitId))
    .leftJoin(sql`items`, eq(itemsToOutfits.itemId, sql`items.id`))
    .groupBy(outfits.id).having(sql`NOT EXISTS (
      SELECT 1 FROM outfits o2 
      JOIN items_to_outfits io2 ON io2.outfit_id = o2.id
      WHERE io2.item_id IN (
        SELECT io1.item_id 
        FROM items_to_outfits io1 
        WHERE io1.outfit_id = ${outfits.id}
        AND io1.item_type::text IN ('layer', 'top', 'bottom')
      )
      AND io2.item_type::text IN ('layer', 'top', 'bottom')
      AND o2.wear_date > CURRENT_DATE - ${recencyThreshold}::integer
      GROUP BY o2.id
      HAVING COUNT(DISTINCT io2.item_id) = (
        SELECT COUNT(DISTINCT io3.item_id)
        FROM items_to_outfits io3
        WHERE io3.outfit_id = ${outfits.id}
        AND io3.item_type::text IN ('layer', 'top', 'bottom')
      )
    )`)

  const calculateTimeFactorScore = (days: number, wearCount: number, recentlyWornCount: number) => {
    if (days < recencyThreshold) return 0

    // Calculate ideal wear interval (14-60 days) based on wardrobe size
    const baseInterval = Math.max(14, Math.min(Math.ceil(wardrobeSize / 10), 60))
    const idealInterval = (() => {
      if (wearCount <= 1) return baseInterval * 1.5 // New or rarely worn items
      if (wearCount <= 3) return baseInterval // Occasionally worn items
      if (wearCount <= 6) return baseInterval * 0.7 // Regularly worn items
      return baseInterval * 0.5 // Frequently worn items
    })()

    // Score based on deviation from ideal interval
    let timeScore = 0
    if (days < idealInterval * 0.35) timeScore = 10
    else if (days < idealInterval * 0.7) timeScore = 20
    else if (days < idealInterval * 1.5) timeScore = 40
    else if (days < idealInterval * 2.5) timeScore = 30
    else if (days < idealInterval * 4.0) timeScore = 20

    // Apply similarity penalty
    const similarityPenalty = recentlyWornCount * 5
    return Math.max(0, timeScore - similarityPenalty)
  }

  // Score based on how often the outfit has been worn
  const calculateFrequencyScore = (wearCount: number) => {
    if (wearCount === 0) return 20 // Never worn
    if (wearCount < 2) return 15 // Rarely worn
    if (wearCount < 4) return 10 // Occasionally worn
    if (wearCount < 8) return 5 // Regularly worn
    return 0 // Frequently worn
  }

  // Score based on previous wear patterns for this day of week
  const calculateDayOfWeekScore = (sameDayCount: number) => {
    const dayOfWeekConfidence = Math.min(sameDayCount / 3, 1) // Caps at 3 same-day wears
    return sameDayCount > 0 ? 15 * dayOfWeekConfidence : 0
  }

  const calculateScores = (outfit: (typeof outfitsWithScores)[0]) => {
    // 1. Base Score (0-40)
    const ratingConfidence = Math.min((outfit.wearCount as number) / 5, 1)
    const base_score = Math.trunc((outfit.rating as number) * 10 * ratingConfidence)

    // 2. Items Score (0-32)
    const items_score = (() => {
      if (!outfit.avgItemRating || !outfit.itemCount) return 0
      const itemCountBonus = Math.min((outfit.itemCount as number) / 4, 1)
      return Math.trunc((outfit.avgItemRating as number) * 8 * itemCountBonus)
    })()

    // 3. Time Factor (0-40)
    const time_factor = Math.trunc(
      calculateTimeFactorScore(
        outfit.daysSinceWorn as number,
        outfit.wearCount as number,
        outfit.recentlyWornItemCount as number
      )
    )

    // 4. Frequency Score (0-20)
    const frequency_score = Math.trunc(calculateFrequencyScore(outfit.wearCount as number))

    // 5. Day of Week Score (0-15)
    const day_of_week_score = Math.trunc(
      calculateDayOfWeekScore(outfit.sameDayOfWeekCount as number)
    )

    // 6. Seasonal Score (0-15)
    const seasonal_score = Math.trunc((outfit.seasonalRelevance as number) * 15)

    return {
      base_score,
      items_score,
      time_factor,
      frequency_score,
      day_of_week_score,
      seasonal_score,
    }
  }

  const scoredOutfits = outfitsWithScores
    // First, group outfits by their core items and keep only the most recent one
    .reduce((acc, outfit) => {
      const coreItemsKey = (outfit.coreItems as string[]).filter(Boolean).sort().join('|')

      // Only keep this outfit if it's more recent than existing one with same core items
      if (
        !acc.has(coreItemsKey) ||
        new Date(outfit.lastWorn as string) > new Date(acc.get(coreItemsKey)!.lastWorn as string)
      ) {
        acc.set(coreItemsKey, outfit)
      }
      return acc
    }, new Map())
    .values()

  // Convert to array and calculate scores
  const uniqueOutfits = Array.from(scoredOutfits).map((outfit) => ({
    outfitId: outfit.id,
    score: Object.values(calculateScores(outfit)).reduce((a, b) => a + b, 0),
  }))

  const suggestedOutfits = await c.get('db').query.outfits.findMany({
    where: inArray(
      outfits.id,
      uniqueOutfits
        .sort((a, b) => b.score - a.score)
        .slice(pageNumber * pageSize, pageNumber * pageSize + pageSize + 1)
        .map((o) => o.outfitId)
    ),
    with: {
      itemsToOutfits: {
        columns: {
          itemId: false,
          outfitId: false,
        },
        with: {
          item: true,
        },
        orderBy: (itemsToOutfits, { asc }) => [asc(itemsToOutfits.itemType)],
      },
    },
  })

  const outfitsWithDetails = suggestedOutfits
    .map((outfit) => {
      const outfitScore = outfitsWithScores.find((s) => s.id === outfit.id)
      const scores = outfitScore
        ? calculateScores(outfitScore)
        : {
            base_score: 0,
            items_score: 0,
            time_factor: 0,
            frequency_score: 0,
            day_of_week_score: 0,
            seasonal_score: 0,
          }

      return {
        ...outfit,
        scoring_details: {
          ...scores,
          total_score: Math.trunc(Object.values(scores).reduce((a, b) => a + b, 0)),
          raw_data: {
            wear_count: outfitScore?.wearCount || 0,
            days_since_worn: outfitScore?.daysSinceWorn || 0,
            same_day_count: outfitScore?.sameDayOfWeekCount || 0,
            seasonal_relevance: outfitScore?.seasonalRelevance || 0,
            recently_worn_items: outfitScore?.recentlyWornItemCount || 0,
            core_items: outfitScore?.coreItems || [],
          },
        },
      }
    })
    .sort((a, b) => b.scoring_details.total_score - a.scoring_details.total_score)

  const filteredOutfits = [...outfitsWithDetails]
    .sort((a, b) => b.scoring_details.total_score - a.scoring_details.total_score)
    .slice(0, pageSize + 1)

  const last_page = !(filteredOutfits.length > pageSize)
  if (!last_page) filteredOutfits.pop()

  return c.json({
    suggestions: filteredOutfits,
    generated_at: today,
    metadata: {
      wardrobe_size: wardrobeSize,
      recency_threshold: recencyThreshold,
      last_page: last_page,
    },
  })
})

app.get('/streak', injectDB, async (c) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const streakData = await c
    .get('db')
    .select({
      date: sql<string>`DATE(${outfits.wearDate})::text`,
      count: sql<number>`COUNT(*)::integer`,
    })
    .from(outfits)
    .groupBy(sql`DATE(${outfits.wearDate})`)
    .orderBy(sql`DATE(${outfits.wearDate}) DESC`)

  const datesWithOutfits = new Set(
    streakData.map((row) => new Date(row.date).toISOString().split('T')[0])
  )

  let currentStreak = 0
  let longestStreak = 0
  const checkDate = today

  // Calculate current streak
  while (datesWithOutfits.has(checkDate.toISOString().split('T')[0])) {
    currentStreak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  // Allow one day grace period for current streak
  if (
    currentStreak === 0 &&
    datesWithOutfits.has(new Date(today.getTime() - 86400000).toISOString().split('T')[0])
  ) {
    currentStreak = 1
  }

  // Calculate longest streak
  let tempStreak = 1 // Start at 1 since we're counting the current day
  streakData.forEach((row, i) => {
    const currentDate = new Date(row.date)
    const nextDate = streakData[i + 1] ? new Date(streakData[i + 1].date) : null

    if (nextDate && currentDate.getTime() - nextDate.getTime() === 86400000) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1 // Reset to 1 instead of 0 since we're starting a new streak
    }
  })

  return c.json({
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_logged_date: streakData[0]?.date || null,
    metadata: {
      generated_at: today.toISOString(),
      is_grace_period:
        currentStreak === 1 && !datesWithOutfits.has(today.toISOString().split('T')[0]),
    },
  })
})

export default app
