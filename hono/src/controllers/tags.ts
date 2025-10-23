import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { tag } from '../schema'
import type { TagService } from '../services/TagService'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'

const insertTagSchema = createInsertSchema(tag, {
  name: z.string().min(1).max(60),
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i),
}).omit({ id: true, createdAt: true, userId: true })

const selectTagSchema = createSelectSchema(tag, {
  id: z.string().refine((val) => isCuid(val)),
})

const app = new Hono<{ Variables: AuthVariables & DBVariables & ServiceVariables }>()
  .get('/', requireAuth, injectDB, injectServices, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''

    return c.json(await c.get('tagService').getAllTags(userId))
  })
  .post(
    '/',
    zValidator('json', insertTagSchema),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const body = c.req.valid('json')

      try {
        return c.json(await c.get('tagService').createTag(userId, body))
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ message: error.message }, 400)
        }
        throw error
      }
    }
  )
  .put(
    '/:id',
    zValidator('param', selectTagSchema.pick({ id: true })),
    zValidator('json', insertTagSchema),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')
      const body = c.req.valid('json')

      try {
        return c.json(await c.get('tagService').updateTag(userId, params.id, body))
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ message: error.message }, 400)
        }
        throw error
      }
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectTagSchema.pick({ id: true })),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')

      try {
        return c.json(await c.get('tagService').deleteTag(userId, params.id))
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ message: error.message }, 400)
        }
        throw error
      }
    }
  )

export default app
