import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import type { SQL } from 'drizzle-orm'
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { Hono } from 'hono'
import { z } from 'zod'

import { itemTypeEnum, items, itemsToOutfits, outfits } from '../schema'
import type { Variables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'

const app = new Hono<{ Variables: Variables }>()

const insertItemSchema = createInsertSchema(items, {
  name: z.string().min(1).max(60),
  brand: z.string().min(1).max(60),
  photoUrl: z.string().url(),
  type: z.enum(itemTypeEnum),
  rating: z.number().min(0).max(4).default(2),
  authorUsername: z.string().default(''),
}).omit({ id: true, createdAt: true, authorUsername: true })

const selectItemSchema = createSelectSchema(items, {
  id: z.string().refine((val) => isCuid(val)),
})

const paginationValidationItems = z.object({
  page: z
    .string()
    .refine((val) => !isNaN(+val) && +val >= 0, {
      message: 'Items page number must be a non-negative number',
    })
    .optional(),
  size: z
    .string()
    .refine((val) => !isNaN(+val) && +val > 0 && +val <= 1000, {
      message: 'Items page size must be a positive number and less than or equal to 1000',
    })
    .optional(),
  search: z.string().optional(),
})

const getItemQuery = (db: Variables['db'], whereClause: SQL<unknown> | undefined) => {
  return db.query.items
    .findMany({
      where: whereClause,
      with: {
        itemsToOutfits: {
          with: {
            outfit: {
              columns: {
                wearDate: true,
              },
            },
          },
        },
        tagsToItems: {
          columns: {
            tagId: false,
            itemId: false,
          },
          with: {
            tag: true,
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
        createdAt: item.createdAt,
        authorUsername: item.authorUsername,
        lastWornAt: item.itemsToOutfits.length
          ? new Date(Math.max(...item.itemsToOutfits.map((rel) => rel.outfit.wearDate.getTime()))).toISOString().split('T')[0]
          : null,
        tagsToItems: item.tagsToItems,
      }))
    )
}

app.get('/', zValidator('query', paginationValidationItems), injectDB, async (c) => {
  const { page, size, search } = c.req.query()
  const pageNumber: number = page ? +page : 0
  const pageSize: number = size ? +size : 25

  const whereClause = search
    ? and(
        ...search
          .toLowerCase()
          .split(/\s+/)
          .map((word) => or(ilike(items.name, `%${word}%`), ilike(items.brand, `%${word}%`))),
        eq(items.authorUsername, 'rak3rman')
      )
    : eq(items.authorUsername, 'rak3rman')

  const itemsData = await getItemQuery(c.get('db'), whereClause).then((items) => {
    // Sort by lastWornAt (nulls first) then name
    return items
      .sort((a, b) => {
        if (!a.lastWornAt && !b.lastWornAt) return a.name.localeCompare(b.name)
        if (!a.lastWornAt) return -1
        if (!b.lastWornAt) return 1
        const dateCompare = new Date(a.lastWornAt).getTime() - new Date(b.lastWornAt).getTime()
        return dateCompare === 0 ? a.name.localeCompare(b.name) : dateCompare
      })
      .slice(pageNumber * pageSize, pageNumber * pageSize + pageSize + 1)
  })

  const last_page = !(itemsData.length > pageSize)
  if (!last_page) itemsData.pop()

  return c.json({
    items: itemsData,
    last_page: last_page,
  })
})

app.get('/:id', zValidator('param', selectItemSchema.pick({ id: true })), injectDB, async (c) => {
  const { id } = c.req.valid('param')

  const itemData = await getItemQuery(
    c.get('db'),
    and(eq(items.id, id), eq(items.authorUsername, 'rak3rman'))
  ) // NOTE: Aware that this is not good practice, could be more efficient

  if (!itemData.length) {
    return c.json({ message: 'Item not found' }, 404)
  }

  return c.json(itemData[0])
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
      (
        await c
          .get('db')
          .insert(items)
          .values({
            ...body,
            authorUsername: 'rak3rman', // TODO: remove and replace with author integration
          })
          .onConflictDoNothing()
          .returning()
      )[0]
    )
  }
)

app.put(
  '/:id',
  zValidator('param', selectItemSchema.pick({ id: true })),
  zValidator('json', insertItemSchema),
  injectDB,
  async (c) => {
    const params = c.req.valid('param')
    const body = c.req.valid('json')

    return c.json(
      (
        await c
          .get('db')
          .update(items)
          .set({
            ...body,
            authorUsername: 'rak3rman', // TODO: remove and replace with author integration
          })
          .where(eq(items.id, params.id))
          .returning()
      )[0]
    )
  }
)

app.delete(
  '/:id',
  zValidator('param', selectItemSchema.pick({ id: true })),
  injectDB,
  async (c) => {
    const params = c.req.valid('param')

    return c.json(
      await c.get('db').transaction(async (tx) => {
        // Get the ids of outfits that have the item being deleted
        const outfitsToDelete = await tx
          .select({ outfitId: itemsToOutfits.outfitId })
          .from(itemsToOutfits)
          .where(eq(itemsToOutfits.itemId, params.id))

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
        return (await tx.delete(items).where(eq(items.id, params.id)).returning())[0]
      })
    )
  }
)

export default app
