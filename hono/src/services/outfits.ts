import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { item, itemTypeEnum, outfit, outfitItem, outfitTag } from '../schema'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'
import recommendations from './recommendations'
import { isVirtualTag } from './tags'

const insertOutfitSchema = createInsertSchema(outfit, {
  rating: z.number().min(0).max(2).default(1),
  wearDate: z.coerce.date().optional(),
  locationLatitude: z.number().min(-90).max(90).optional(),
  locationLongitude: z.number().min(-180).max(180).optional(),
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

const selectOutfitSchema = createSelectSchema(outfit, {
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

const app = new Hono<{ Variables: AuthVariables & DBVariables }>()
  .get('/', zValidator('query', paginationValidationOutfits), requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const { page, size } = c.req.query()

    const pageNumber: number = page ? +page : 0
    const pageSize: number = size ? +size : 10

    const outfitsData = await c.get('db').query.outfit.findMany({
      where: and(
        eq(outfit.userId, userId),
        sql`${outfit.wearDate} IS NOT NULL` // Exclude ghost outfits
      ),
      with: {
        outfitItems: {
          columns: {
            outfitId: false,
          },
          orderBy: (outfitItems, { asc }) => [asc(outfitItems.itemType)],
        },
        outfitTags: {
          columns: {
            outfitId: false,
          },
        },
      },
      orderBy: (outfit, { desc }) => [desc(outfit.wearDate)],
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
          // Find which of these items (if any) are currently withheld or retired
          const unavailableItems = await tx.query.item.findMany({
            where: and(
              inArray(item.id, itemIds),
              sql`item.status != 'available'`,
              eq(item.userId, userId)
            ),
            columns: {
              id: true,
            },
          })

          // If any unavailable items were found, make them available
          if (unavailableItems.length > 0) {
            const unavailableItemIds = unavailableItems.map((item) => item.id)

            // Make the items available
            await tx
              .update(item)
              .set({ status: 'available' })
              .where(inArray(item.id, unavailableItemIds))
          }
        }

        const outfitData = {
          ...body,
          userId,
        }

        const newOutfit = (
          await tx.insert(outfit).values(outfitData).onConflictDoNothing().returning()
        )[0]

        // Insert item to outfit relationships
        await tx.insert(outfitItem).values(
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
            await tx.insert(outfitTag).values(
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
            .delete(outfit)
            .where(and(eq(outfit.id, params.id), eq(outfit.userId, userId)))
            .returning()
        )[0]
      )
    }
  )
  .route('/', recommendations)

export default app
