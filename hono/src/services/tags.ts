import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { tags, tagsToItems, tagsToOutfits } from '../schema'
import { requireAuth } from '../utils/auth'
import type { Variables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'

const insertTagSchema = createInsertSchema(tags, {
  name: z.string().min(1).max(60),
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  minDaysBeforeItemReuse: z.number().min(-1).max(365).default(-1),
  authorUsername: z.string().default(''),
}).omit({ id: true, createdAt: true })

const selectTagSchema = createSelectSchema(tags, {
  id: z.string().refine((val) => isCuid(val)),
})

const app = new Hono<{ Variables: Variables }>()
  .get('/', requireAuth, injectDB, async (c) => {
    const tagsData = await c.get('db').query.tags.findMany({
      where: eq(tags.authorUsername, 'rak3rman'), // TODO: remove and replace with author integration
      orderBy: (tags, { asc }) => [asc(tags.name)],
    })

    return c.json(tagsData)
  })
  .post('/', zValidator('json', insertTagSchema), injectDB, async (c) => {
    const body = c.req.valid('json')

    return c.json(
      (
        await c
          .get('db')
          .insert(tags)
          .values({
            ...body,
            authorUsername: 'rak3rman', // TODO: remove and replace with author integration
          })
          .returning()
      )[0]
    )
  })
  .put(
    '/:id',
    zValidator('param', selectTagSchema.pick({ id: true })),
    zValidator('json', insertTagSchema),
    injectDB,
    async (c) => {
      const params = c.req.valid('param')
      const body = c.req.valid('json')

      return c.json(
        (
          await c
            .get('db')
            .update(tags)
            .set({
              ...body,
              authorUsername: 'rak3rman', // TODO: remove and replace with author integration
            })
            .where(eq(tags.id, params.id))
            .returning()
        )[0]
      )
    }
  )
  .delete('/:id', zValidator('param', selectTagSchema.pick({ id: true })), injectDB, async (c) => {
    const params = c.req.valid('param')

    return c.json(
      await c.get('db').transaction(async (tx) => {
        // Delete tag relationships first
        await tx.delete(tagsToItems).where(eq(tagsToItems.tagId, params.id))
        await tx.delete(tagsToOutfits).where(eq(tagsToOutfits.tagId, params.id))

        // Then delete the tag
        return (await tx.delete(tags).where(eq(tags.id, params.id)).returning())[0]
      })
    )
  })

export default app
