import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { eq, inArray } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'
import { items, itemsToOutfits, itemTypeEnum, outfits } from '../schema'
import type { Variables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'

const app = new Hono<{ Variables: Variables }>()

const insertItemSchema = createInsertSchema(items, {
  name: z.string().min(1).max(60),
  brand: z.string().min(1).max(60),
  photoUrl: z.string().url(),
  type: z.enum(itemTypeEnum),
  rating: z.number().min(0).max(4).default(2),
  authorUsername: z.string().default(''),
}).omit({ id: true, createdAt: true, authorUsername: true })

const selectItemSchema = createSelectSchema(items, {
  id: z.string().refine((val) => isCuid(val)),
})

const paginationValidationItems = z.object({
  page: z
    .string()
    .refine((val) => !isNaN(+val) && +val >= 0, {
      message: 'Items page number must be a non-negative number',
    })
    .optional(),
  size: z
    .string()
    .refine((val) => !isNaN(+val) && +val > 0 && +val <= 1000, {
      message: 'Items page size must be a positive number and less than or equal to 1000',
    })
    .optional(),
})

app.get('/', zValidator('query', paginationValidationItems), injectDB, async (c) => {
  const { page, size } = c.req.query()

  const pageNumber: number = page ? +page : 0
  const pageSize: number = size ? +size : 25

  const itemsData = await c
    .get('db')
    .select()
    .from(items)
    .where(eq(items.authorUsername, 'rak3rman'))
    .limit(pageSize + 1)
    .offset(pageNumber * pageSize)

  const last_page = !(itemsData.length > pageSize)
  if (!last_page) itemsData.pop()

  return c.json({
    items: itemsData,
    last_page: last_page,
  })
})

app.post(
  '/',
  zValidator(
    'json',
    insertItemSchema.required({
      name: true,
      type: true,
      rating: true,
    })
  ),
  injectDB,
  async (c) => {
    const body = c.req.valid('json')

    return c.json(
      (
        await c
          .get('db')
          .insert(items)
          .values({
            ...body,
            authorUsername: 'rak3rman', // TODO: remove and replace with author integration
          })
          .onConflictDoNothing()
          .returning()
      )[0]
    )
  }
)

app.put(
  '/:id',
  zValidator('param', selectItemSchema.pick({ id: true })),
  zValidator('json', insertItemSchema),
  injectDB,
  async (c) => {
    const params = c.req.valid('param')
    const body = c.req.valid('json')

    return c.json(
      (
        await c
          .get('db')
          .update(items)
          .set({
            ...body,
            authorUsername: 'rak3rman', // TODO: remove and replace with author integration
          })
          .where(eq(items.id, params.id))
          .returning()
      )[0]
    )
  }
)

app.delete(
  '/:id',
  zValidator('param', selectItemSchema.pick({ id: true })),
  injectDB,
  async (c) => {
    const params = c.req.valid('param')

    return c.json(
      await c.get('db').transaction(async (tx) => {
        // Get the ids of outfits that have the item being deleted
        const outfitsToDelete = await tx
          .select({ outfitId: itemsToOutfits.outfitId })
          .from(itemsToOutfits)
          .where(eq(itemsToOutfits.itemId, params.id))

        // Delete outfits by ids
        if (outfitsToDelete.length) {
          await tx.delete(outfits).where(
            inArray(
              outfits.id,
              outfitsToDelete.map((e: { outfitId: string }) => e.outfitId)
            )
          )
        }

        // Delete the specified item
        return (await tx.delete(items).where(eq(items.id, params.id)).returning())[0]
      })
    )
  }
)

export default app
