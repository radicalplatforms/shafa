import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
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
    .refine((val) => !isNaN(+val) && +val > 0 && +val < 100, {
      message: 'Outfits page size must be a positive number and less than 100',
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

export default app
