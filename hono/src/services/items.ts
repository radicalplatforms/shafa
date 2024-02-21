import { zValidator } from '@hono/zod-validator'
import { eq, inArray } from 'drizzle-orm'
import { createInsertSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'
import { items, itemsToOutfits, itemTypeEnum, outfits } from '../schema'
import type { Variables } from '../utils/injectDB'
import injectDB from '../utils/injectDB'

const app = new Hono<{ Variables: Variables }>()

const insertItemSchema = createInsertSchema(items, {
  name: z.string().min(1).max(60),
  brand: z.string().min(1).max(60),
  photoUrl: z.string().url(),
  type: z.enum(itemTypeEnum),
  rating: z.number().min(0).max(4).default(2),
  authorUsername: z.string().default(''),
}).omit({ id: true, createdAt: true, authorUsername: true })

app.get('/', injectDB, async (c) => {
  return c.json(await c.get('db').query.items.findMany())
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
      await c
        .get('db')
        .insert(items)
        .values({
          ...body,
          authorUsername: 'rak3rman', // TODO: remove and replace with author integration
        })
        .onConflictDoNothing()
        .returning()
    )
  }
)

app.put('/:id', zValidator('json', insertItemSchema), injectDB, async (c) => {
  const id: string = c.req.param('id')
  const body = c.req.valid('json')

  return c.json(
    await c
      .get('db')
      .update(items)
      .set({
        ...body,
        authorUsername: 'rak3rman', // TODO: remove and replace with author integration
      })
      .where(eq(items.id, id))
      .returning()
  )
})

app.delete('/:id', injectDB, async (c) => {
  const id: string = c.req.param('id')

  return c.json(
    await c.get('db').transaction(async (tx) => {
      // Get the ids of outfits that have the item being deleted
      const outfitsToDelete = await tx
        .select({ outfitId: itemsToOutfits.outfitId })
        .from(itemsToOutfits)
        .where(eq(itemsToOutfits.itemId, id))

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
      return tx.delete(items).where(eq(items.id, id)).returning()
    })
  )
})

export default app
