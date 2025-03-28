import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { and, eq } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { tags } from '../schema'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'

const insertTagSchema = createInsertSchema(tags, {
  name: z.string().min(1).max(60),
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  minDaysBeforeItemReuse: z.number().min(-1).max(365).default(-1),
}).omit({ id: true, createdAt: true, userId: true })

const selectTagSchema = createSelectSchema(tags, {
  id: z.string().refine((val) => isCuid(val)),
})

const app = new Hono<{ Variables: AuthVariables & DBVariables }>()
  .get('/', requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''

    const tagsData = await c.get('db').query.tags.findMany({
      where: eq(tags.userId, userId),
      orderBy: (tags, { asc }) => [asc(tags.name)],
    })

    return c.json(tagsData)
  })
  .post('/', zValidator('json', insertTagSchema), requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const body = c.req.valid('json')

    return c.json(
      (
        await c
          .get('db')
          .insert(tags)
          .values({
            ...body,
            userId,
          })
          .returning()
      )[0]
    )
  })
  .put(
    '/:id',
    zValidator('param', selectTagSchema.pick({ id: true })),
    zValidator('json', insertTagSchema),
    requireAuth,
    injectDB,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')
      const body = c.req.valid('json')

      return c.json(
        (
          await c
            .get('db')
            .update(tags)
            .set({
              ...body,
              userId,
            })
            .where(eq(tags.id, params.id))
            .returning()
        )[0]
      )
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectTagSchema.pick({ id: true })),
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
            .delete(tags)
            .where(and(eq(tags.id, params.id), eq(tags.userId, userId)))
            .returning()
        )[0]
      )
    }
  )

export default app
