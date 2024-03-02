import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { eq, inArray, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'
import { items, itemsToOutfits, itemTypeEnum, itemsExtended, outfits } from '../schema'
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

app.get('/', injectDB, async (c) => {
  await c.get('db').refreshMaterializedView(itemsExtended)
  return c.json(await c.get('db').select().from(itemsExtended))
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
    const response = (
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
    await c.get('db').refreshMaterializedView(itemsExtended)
    return c.json(response)
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
    const response = (
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
    await c.get('db').refreshMaterializedView(itemsExtended)
    return c.json(response)
  }
)

app.delete(
  '/:id',
  zValidator('param', selectItemSchema.pick({ id: true })),
  injectDB,
  async (c) => {
    const params = c.req.valid('param')
    const response = await c.get('db').transaction(async (tx) => {
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
    await c.get('db').refreshMaterializedView(itemsExtended)
    return c.json(response)
  }
)

export default app
