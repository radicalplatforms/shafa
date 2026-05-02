import { zValidator } from '@hono/zod-validator'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { tag } from '../schema'
import { getUserId, requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'
import { PaginationInputSchema } from '../utils/pagination'
import { isValidUUID } from '../utils/uuid'

const getTagsSchema = PaginationInputSchema

const insertTagSchema = createInsertSchema(tag, {
  name: z.string().min(1).max(60),
  hexColor: z.string().regex(/^#[0-9A-F]{6}$/i),
}).omit({ id: true, createdAt: true, userId: true })

const selectTagSchema = createSelectSchema(tag, {
  id: z.string().refine(isValidUUID),
}).pick({ id: true })

const app = new Hono<{
  Variables: AuthVariables & ServiceVariables
}>()
  .get(
    '/',
    zValidator('query', getTagsSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { limit, offset } = c.req.valid('query')

      const result = await c.get('tagService').tags(userId, { limit, offset })

      return c.json(result)
    }
  )
  .post(
    '/',
    zValidator('json', insertTagSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const body = c.req.valid('json')

      const result = await c.get('tagService').createTag(userId, body)

      return c.json(result)
    }
  )
  .put(
    '/:id',
    zValidator('param', selectTagSchema),
    zValidator('json', insertTagSchema.partial()),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: tagId } = c.req.valid('param')
      const body = c.req.valid('json')

      const result = await c.get('tagService').updateTag(userId, tagId, body)

      return c.json(result)
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectTagSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: tagId } = c.req.valid('param')

      const result = await c.get('tagService').deleteTag(userId, tagId)

      return c.json(result)
    }
  )

export default app
