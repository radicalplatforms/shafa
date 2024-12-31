import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { eq, and, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'
import { itemsToOutfits, itemTypeEnum, outfits } from '../schema'
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
  limit: z
    .string()
    .refine((val) => !isNaN(+val) && +val > 0 && +val <= 10, {
      message: 'Suggestions limit must be a positive number and less than or equal to 10',
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
  const { limit } = c.req.query()
  const suggestionLimit = limit ? +limit : 3
  const today = new Date()

  // First, get all outfits with their wear history and ratings
  const outfitsWithScores = await c
    .get('db')
    .select({
      id: outfits.id,
      rating: outfits.rating,
      lastWorn: sql<string>`MAX(${outfits.wearDate})`,
      wearCount: sql<number>`COUNT(${outfits.wearDate})`,
      // Calculate days since last wear
      daysSinceWorn: sql<number>`
        EXTRACT(DAYS FROM NOW() - MAX(${outfits.wearDate}))::integer
      `,
      // Calculate if this outfit was worn on the same day of week
      sameDayOfWeekCount: sql<number>`
        SUM(CASE 
          WHEN EXTRACT(DOW FROM ${outfits.wearDate}) = EXTRACT(DOW FROM NOW()) 
          THEN 1 ELSE 0 
        END)
      `,
      // Calculate seasonal relevance (assuming Northern Hemisphere)
      // 1 if outfit was worn in the same season historically
      seasonalRelevance: sql<number>`
        AVG(CASE 
          WHEN EXTRACT(MONTH FROM ${outfits.wearDate}) BETWEEN 
            EXTRACT(MONTH FROM NOW()) - 1 
            AND EXTRACT(MONTH FROM NOW()) + 1 
          THEN 1 ELSE 0 
        END)
      `,
    })
    .from(outfits)
    .groupBy(outfits.id)
    .having(sql`MAX(${outfits.wearDate}) < NOW() - INTERVAL '5 days'`) // Basic cooldown period

  // Calculate a composite score for each outfit
  const scoredOutfits = outfitsWithScores.map((outfit) => {
    const baseScore = outfit.rating * 20 // Rating 0-4 becomes 0-80 points

    // Time-based decay: Gradually increase score for unworn items
    // but not too much to avoid suggesting very old outfits
    const timeFactor = Math.min(outfit.daysSinceWorn / 30, 1) * 20 // Max 20 points

    // Frequency balance: Prefer less frequently worn outfits
    const frequencyScore =
      outfit.wearCount < 3 ? 15 : outfit.wearCount < 5 ? 10 : outfit.wearCount < 10 ? 5 : 0

    // Day of week preference
    const dayOfWeekScore = outfit.sameDayOfWeekCount > 0 ? 15 : 0

    // Seasonal relevance
    const seasonalScore = outfit.seasonalRelevance * 20

    const totalScore = baseScore + timeFactor + frequencyScore + dayOfWeekScore + seasonalScore

    return {
      outfitId: outfit.id,
      score: totalScore,
    }
  })

  // Get top-scoring outfits with their full details
  const suggestedOutfits = await c.get('db').query.outfits.findMany({
    where: and(
      sql`${outfits.id} IN ${scoredOutfits
        .sort((a, b) => b.score - a.score)
        .slice(0, suggestionLimit)
        .map((o) => o.outfitId)}`
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

  // Sort the results by their calculated scores
  const sortedOutfits = suggestedOutfits.sort((a, b) => {
    const scoreA = scoredOutfits.find((s) => s.outfitId === a.id)?.score || 0
    const scoreB = scoredOutfits.find((s) => s.outfitId === b.id)?.score || 0
    return scoreB - scoreA
  })

  return c.json({
    suggestions: sortedOutfits,
    generated_at: today,
  })
})

export default app
