import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import type { SQL } from 'drizzle-orm'
import { and, eq, ilike, or } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { item, itemStatusEnum, itemTypeEnum } from '../schema'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'

const insertItemSchema = createInsertSchema(item, {
  name: z.string().min(1).max(60),
  brand: z.string().min(1).max(60),
  photoUrl: z.string().url(),
  type: z.enum(itemTypeEnum),
  rating: z.number().min(0).max(4).default(2),
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

const getItemQuery = (db: DBVariables['db'], whereClause: SQL<unknown> | undefined) => {
  return db.query.item
    .findMany({
      where: whereClause,
      with: {
        outfitItems: {
          with: {
            outfit: {
              columns: {
                wearDate: true,
              },
            },
          },
        },
        itemTags: {
          columns: {
            itemId: false,
          },
        },
      },
    })
    .then((items) =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        photoUrl: item.photoUrl,
        type: item.type,
        rating: item.rating,
        status: item.status,
        createdAt: item.createdAt,
        userId: item.userId,
        lastWornAt: item.outfitItems.length
          ? item.outfitItems.filter((rel) => rel.outfit.wearDate !== null).length > 0
            ? new Date(
                Math.max(
                  ...item.outfitItems
                    .filter((rel) => rel.outfit.wearDate !== null)
                    .map((rel) => rel.outfit.wearDate!.getTime())
                )
              )
                .toISOString()
                .split('T')[0]
            : null
          : null,
        itemTags: item.itemTags,
      }))
    )
}

const app = new Hono<{ Variables: AuthVariables & DBVariables }>()
  .get('/', zValidator('query', paginationValidationItems), requireAuth, injectDB, async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const { page, size, search } = c.req.query()
    const pageNumber: number | undefined = page ? +page : undefined
    const pageSize: number | undefined = size ? +size : undefined

    const whereClause = search
      ? and(
          ...search
            .toLowerCase()
            .split(/\s+/)
            .map((word) => or(ilike(item.name, `%${word}%`), ilike(item.brand, `%${word}%`))),
          eq(item.userId, userId)
        )
      : eq(item.userId, userId)

    const itemsData = await getItemQuery(c.get('db'), whereClause).then((items) => {
      // Sort by status (available first, then withheld, then retired), then lastWornAt (nulls first), then name
      const sortedItems = items.sort((a, b) => {
        // First sort by status
        const statusOrder: Record<string, number> = { available: 0, withheld: 1, retired: 2 }
        const statusCompare = statusOrder[a.status] - statusOrder[b.status]
        if (statusCompare !== 0) return statusCompare

        // Then use the existing sort logic for items with the same status
        if (!a.lastWornAt && !b.lastWornAt) return a.name.localeCompare(b.name)
        if (!a.lastWornAt) return -1
        if (!b.lastWornAt) return 1
        const dateCompare = new Date(a.lastWornAt).getTime() - new Date(b.lastWornAt).getTime()
        return dateCompare === 0 ? a.name.localeCompare(b.name) : dateCompare
      })

      // Return all items if pagination params are undefined
      if (pageNumber === undefined || pageSize === undefined) {
        return sortedItems
      }

      return sortedItems.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize + 1)
    })

    // Only handle pagination if params are defined
    let last_page = true
    if (pageNumber !== undefined && pageSize !== undefined) {
      last_page = !(itemsData.length > pageSize)
      if (!last_page) itemsData.pop()
    }

    return c.json({
      items: itemsData,
      last_page: last_page,
    })
  })
  .get(
    '/:id',
    zValidator('param', selectItemSchema.pick({ id: true })),
    requireAuth,
    injectDB,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const { id } = c.req.valid('param')

      const itemData = await getItemQuery(
        c.get('db'),
        and(eq(item.id, id), eq(item.userId, userId))
      ) // NOTE: Aware that this is not good practice, could be more efficient

      if (!itemData.length) {
        return c.json({ message: 'Item not found' }, 404)
      }

      return c.json(itemData[0])
    }
  )
  .post(
    '/',
    zValidator(
      'json',
      insertItemSchema.required({
        name: true,
        type: true,
        rating: true,
      })
    ),
    requireAuth,
    injectDB,
    async (c) => {
      const auth = c.get('auth')
      const userId = auth?.userId || ''
      const body = c.req.valid('json')

      return c.json(
        (
          await c
            .get('db')
            .insert(item)
            .values({
              ...body,
              userId,
            })
            .onConflictDoNothing()
            .returning()
        )[0]
      )
    }
  )
  .put(
    '/:id',
    zValidator('param', selectItemSchema.pick({ id: true })),
    zValidator('json', insertItemSchema.partial()),
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
            .update(item)
            .set({
              ...body,
              userId,
            })
            .where(and(eq(item.id, params.id), eq(item.userId, userId)))
            .returning()
        )[0]
      )
    }
  )
  .delete(
    '/:id',
    zValidator('param', selectItemSchema.pick({ id: true })),
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
            .delete(item)
            .where(and(eq(item.id, params.id), eq(item.userId, userId)))
            .returning()
        )[0]
      )
    }
  )

export default app
