import { zValidator } from '@hono/zod-validator'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { itemTypeEnum, outfit } from '../schema'
import { getUserId, requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'
import { HTTPError } from '../utils/http-error'
import { createLogger } from '../utils/logger'
import { PaginationInputSchema } from '../utils/pagination'
import { isValidUUID } from '../utils/uuid'

const logger = createLogger('OutfitsController')

const getOutfitsSchema = PaginationInputSchema

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
          id: z.string().refine(isValidUUID),
          itemType: z.enum(itemTypeEnum),
        })
      )
      .min(1)
      .max(8),
    tagIds: z.array(z.string()).max(8),
  })
  .omit({ id: true, userId: true })

const selectOutfitSchema = createSelectSchema(outfit, {
  id: z.string().refine(isValidUUID),
}).pick({ id: true })

const getSuggestionsSchema = PaginationInputSchema.extend({
  tagId: z.string().optional(),
})

const app = new Hono<{
  Variables: AuthVariables & ServiceVariables
}>()
  .get(
    '/',
    zValidator('query', getOutfitsSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { limit, offset } = c.req.valid('query')

      const result = await c
        .get('outfitService')
        .outfits(userId, { limit, offset })

      return c.json(result)
    }
  )
  .get(
    '/suggest',
    zValidator('query', getSuggestionsSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { offset, limit, tagId } = c.req.valid('query')

      const result = await c.get('outfitService').suggestions(userId, {
        offset,
        limit,
        tagId,
      })

      return c.json(result)
    }
  )
  .get(
    '/:id',
    zValidator('param', selectOutfitSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: outfitId } = c.req.valid('param')

      const outfitData = await c
        .get('outfitService')
        .outfitById(userId, outfitId)

      if (!outfitData) {
        logger.warn(`Outfit not found [user:${userId.slice(0, 8)} outfit:${outfitId.slice(0, 8)}]`)
        throw new HTTPError(404, 'Outfit not found')
      }

      return c.json(outfitData)
    }
  )
  .post(
    '/',
    zValidator('json', insertOutfitSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const body = c.req.valid('json')

      const result = await c.get('outfitService').createOutfit(userId, body)

      return c.json(result)
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectOutfitSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: outfitId } = c.req.valid('param')

      const result = await c.get('outfitService').deleteOutfit(userId, outfitId)

      return c.json(result)
    }
  )

export default app
