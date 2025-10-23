import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { itemTypeEnum, outfit } from '../schema'
import type { OutfitService } from '../services/OutfitService'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'

const insertOutfitSchema = createInsertSchema(outfit, {
  rating: z.number().min(0).max(2).default(1),
  wearDate: z.coerce.date().optional(),
  locationLatitude: z.number().min(-90).max(90).optional(),
  locationLongitude: z.number().min(-180).max(180).optional(),
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
    tagIds: z.array(z.string()).max(8),
  })
  .omit({ id: true, userId: true })

const selectOutfitSchema = createSelectSchema(outfit, {
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
    .refine((val) => !isNaN(+val) && +val > 0 && +val <= 100, {
      message: 'Outfits page size must be a positive number and less than or equal to 100',
    })
    .optional(),
})

const suggestionsValidation = z.object({
  page: z
    .string()
    .refine((val) => !isNaN(+val) && +val >= 0, {
      message: 'Suggestions page number must be a non-negative number',
    })
    .optional(),
  size: z
    .string()
    .refine((val) => !isNaN(+val) && +val > 0 && +val <= 100, {
      message: 'Suggestions page size must be a positive number and less than or equal to 100',
    })
    .optional(),
  tagId: z.string().optional(),
})

const app = new Hono<{ Variables: AuthVariables & DBVariables & ServiceVariables }>()
  .get(
    '/',
    zValidator('query', paginationValidationOutfits),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const { page, size } = c.req.query()

      const pageNumber: number = page ? +page : 0
      const pageSize: number = size ? +size : 10

      const result = await c
        .get('outfitService')
        .getAllOutfits(userId, { page: pageNumber, size: pageSize })

      return c.json(result)
    }
  )
  .post(
    '/',
    zValidator('json', insertOutfitSchema),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const body = c.req.valid('json')

      return c.json(await c.get('outfitService').createOutfit(userId, body))
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectOutfitSchema.pick({ id: true })),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const params = c.req.valid('param')

      return c.json(await c.get('outfitService').deleteOutfit(userId, params.id))
    }
  )
  .get(
    '/suggest',
    zValidator('query', suggestionsValidation),
    requireAuth,
    injectDB,
    injectServices,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const { page, size, tagId } = c.req.query()
      const pageNumber: number = page ? +page : 0
      const pageSize: number = size ? +size : 10

      const result = await c.get('outfitService').getSuggestions(userId, {
        page: pageNumber,
        size: pageSize,
        tagId,
      })

      return c.json(result)
    }
  )

export default app
