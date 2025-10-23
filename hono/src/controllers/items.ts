import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { item, itemStatusEnum, itemTypeEnum } from '../schema'
import type { ItemService } from '../services/ItemService'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'

const insertItemSchema = createInsertSchema(item, {
  name: z.string().min(1).max(60),
  brand: z.string().min(1).max(60),
  type: z.enum(itemTypeEnum),
  status: z.enum(itemStatusEnum).default('available'),
}).omit({ id: true, createdAt: true, userId: true })

const selectItemSchema = createSelectSchema(item, {
  id: z.string().refine((val) => isCuid(val)),
})

const paginationValidationItems = z
  .object({
    page: z
      .string()
      .optional()
      .refine((val) => val === undefined || (!isNaN(+val) && +val >= 0), {
        message: 'Items page number must be a non-negative number',
      }),
    size: z
      .string()
      .optional()
      .refine((val) => val === undefined || (!isNaN(+val) && +val > 0 && +val <= 1000), {
        message: 'Items page size must be a positive number and less than or equal to 1000',
      }),
    search: z.string().optional(),
  })
  .optional()

const app = new Hono<{ Variables: AuthVariables & DBVariables & ServiceVariables }>()
  .get(
    '/',
    zValidator('query', paginationValidationItems),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const { page, size, search } = c.req.query()
      const pageNumber: number | undefined = page ? +page : undefined
      const pageSize: number | undefined = size ? +size : undefined

      const result = await c
        .get('itemService')
        .getAllItems(userId, { page: pageNumber, size: pageSize }, search)

      return c.json(result)
    }
  )
  .get(
    '/:id',
    zValidator('param', selectItemSchema.pick({ id: true })),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const { id } = c.req.valid('param')

      const itemData = await c.get('itemService').getItemById(userId, id)

      if (!itemData) {
        return c.json({ message: 'Item not found' }, 404)
      }

      return c.json(itemData)
    }
  )
  .post(
    '/',
    zValidator(
      'json',
      insertItemSchema.required({
        name: true,
        type: true,
      })
    ),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const body = c.req.valid('json')

      return c.json(await c.get('itemService').createItem(userId, body))
    }
  )
  .put(
    '/:id',
    zValidator('param', selectItemSchema.pick({ id: true })),
    zValidator('json', insertItemSchema.partial()),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')
      const body = c.req.valid('json')

      return c.json(await c.get('itemService').updateItem(userId, params.id, body))
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectItemSchema.pick({ id: true })),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')

      return c.json(await c.get('itemService').deleteItem(userId, params.id))
    }
  )

export default app
