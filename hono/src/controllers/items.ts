import { zValidator } from '@hono/zod-validator'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { item, itemStatusEnum, itemTypeEnum } from '../schema'
import { getUserId, requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'
import { HTTPError } from '../utils/http-error'
import { createLogger } from '../utils/logger'
import { PaginationInputSchema } from '../utils/pagination'
import { isValidUUID } from '../utils/uuid'

const logger = createLogger('ItemsController')

const getItemsSchema = z
  .object({
    search: z.string().optional(),
  })
  .merge(PaginationInputSchema)

const insertItemSchema = createInsertSchema(item, {
  name: z.string().min(1).max(60),
  brand: z.string().min(1).max(60),
  type: z.enum(itemTypeEnum),
  status: z.enum(itemStatusEnum).default('available'),
}).omit({ id: true, createdAt: true, userId: true })

const selectItemSchema = createSelectSchema(item, {
  id: z.string().refine(isValidUUID),
}).pick({ id: true })

const app = new Hono<{
  Variables: AuthVariables & ServiceVariables
}>()
  .get(
    '/',
    zValidator('query', getItemsSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { search, limit, offset } = c.req.valid('query')

      const result = await c
        .get('itemService')
        .items(userId, search, { limit, offset })

      return c.json(result)
    }
  )
  .get(
    '/:id',
    zValidator('param', selectItemSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: itemId } = c.req.valid('param')

      const itemData = await c.get('itemService').itemById(userId, itemId)

      if (!itemData) {
        logger.warn(`Item not found [user:${userId.slice(0, 8)} item:${itemId.slice(0, 8)}]`)
        throw new HTTPError(404, 'Item not found')
      }

      return c.json(itemData)
    }
  )
  .post(
    '/',
    zValidator('json', insertItemSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const body = c.req.valid('json')

      const result = await c.get('itemService').createItem(userId, body)

      return c.json(result)
    }
  )
  .put(
    '/:id',
    zValidator('param', selectItemSchema),
    zValidator('json', insertItemSchema.partial()),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: itemId } = c.req.valid('param')
      const body = c.req.valid('json')

      const result = await c.get('itemService').updateItem(userId, itemId, body)

      return c.json(result)
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectItemSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: itemId } = c.req.valid('param')

      const result = await c.get('itemService').deleteItem(userId, itemId)

      return c.json(result)
    }
  )

export default app
