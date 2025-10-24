import type { SQL } from 'drizzle-orm'
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm'

import { item, outfit, outfitItem, outfitTag, tag } from '../schema'
import type { DBVariables } from '../utils/inject-db'

export interface ItemWithAggregatedTags {
  id: string
  name: string
  brand: string | null
  type: string
  status: string
  createdAt: Date
  userId: string
  lastWornAt: string | null
  aggregatedTags: Array<{
    tagId: string
    tagName: string
    hexColor: string
    count: number
  }>
}

export interface ItemSearchInput {
  text?: string
  itemIdsAny?: string[]
  nameEquals?: string
  brandEquals?: string
  typeIn?: string[]
  statusIn?: string[]
  createdFrom?: string
  createdTo?: string
  inOutfitsOnly?: boolean
  neverWorn?: boolean
  wornWithItemId?: string
  wornBetween?: { startDate: string; endDate: string }
  taggedWithAllTagIds?: string[]
  taggedWithAnyTagIds?: string[]
  taggedWithAllTagNames?: string[]
  taggedWithAnyTagNames?: string[]
  sortBy?: 'createdAt' | 'name' | 'brand' | 'wornCount'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  page?: number
}

export class ItemRepository {
  constructor(private db: DBVariables['db']) {}

  private getItemQuery(whereClause: SQL<unknown> | undefined) {
    return this.db.query.item
      .findMany({
        where: whereClause,
        with: {
          outfitItems: {
            with: {
              outfit: {
                columns: {
                  wearDate: true,
                },
                with: {
                  outfitTags: {
                    with: {
                      tag: {
                        columns: {
                          id: true,
                          name: true,
                          hexColor: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
      .then((items) =>
        items.map((item) => {
          // Aggregate tags from worn outfits only
          const tagCounts = new Map<
            string,
            { tagId: string; tagName: string; hexColor: string; count: number }
          >()

          // Filter to only worn outfits first to avoid unnecessary iterations
          const wornOutfitItems = item.outfitItems.filter(
            (outfitItem) => outfitItem.outfit.wearDate !== null
          )

          wornOutfitItems.forEach((outfitItem) => {
            // Safely handle missing outfitTags
            if (outfitItem.outfit.outfitTags) {
              outfitItem.outfit.outfitTags.forEach((outfitTag) => {
                // Safely handle missing tag data
                if (outfitTag.tag) {
                  const tagId = outfitTag.tag.id
                  const tagName = outfitTag.tag.name
                  const hexColor = outfitTag.tag.hexColor

                  const existing = tagCounts.get(tagId)
                  if (existing) {
                    existing.count += 1
                  } else {
                    tagCounts.set(tagId, { tagId, tagName, hexColor, count: 1 })
                  }
                }
              })
            }
          })

          return {
            id: item.id,
            name: item.name,
            brand: item.brand,
            type: item.type,
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
            aggregatedTags: Array.from(tagCounts.values()),
          }
        })
      )
  }

  async findById(userId: string, itemId: string): Promise<ItemWithAggregatedTags | null> {
    const items = await this.getItemQuery(and(eq(item.id, itemId), eq(item.userId, userId)))
    return items[0] || null
  }

  async create(userId: string, data: any) {
    return (
      await this.db
        .insert(item)
        .values({
          ...data,
          userId,
        })
        .onConflictDoNothing()
        .returning()
    )[0]
  }

  async update(userId: string, itemId: string, data: any) {
    return (
      await this.db
        .update(item)
        .set({
          ...data,
          userId,
        })
        .where(and(eq(item.id, itemId), eq(item.userId, userId)))
        .returning()
    )[0]
  }

  async delete(userId: string, itemId: string) {
    return (
      await this.db
        .delete(item)
        .where(and(eq(item.id, itemId), eq(item.userId, userId)))
        .returning()
    )[0]
  }

  async findByType(userId: string, itemType: string) {
    return this.db.query.item.findMany({
      where: and(eq(item.userId, userId), eq(item.type, itemType)),
    })
  }

  async findByStatus(userId: string, status: string) {
    return this.db.query.item.findMany({
      where: and(eq(item.userId, userId), eq(item.status, status)),
    })
  }

  async search(userId: string, input: ItemSearchInput): Promise<ItemWithAggregatedTags[]> {
    const conditions: SQL<unknown>[] = [eq(item.userId, userId)]

    if (input.text) {
      const textConditions = input.text
        .toLowerCase()
        .split(/\s+/)
        .flatMap((word) => [ilike(item.name, `%${word}%`), ilike(item.brand, `%${word}%`)])
      conditions.push(or(...textConditions)!)
    }

    if (input.itemIdsAny && input.itemIdsAny.length > 0) {
      conditions.push(inArray(item.id, input.itemIdsAny))
    }

    if (input.nameEquals) {
      conditions.push(eq(item.name, input.nameEquals))
    }

    if (input.brandEquals) {
      conditions.push(eq(item.brand, input.brandEquals))
    }

    if (input.typeIn && input.typeIn.length > 0) {
      conditions.push(inArray(item.type, input.typeIn))
    }

    if (input.statusIn && input.statusIn.length > 0) {
      conditions.push(inArray(item.status, input.statusIn))
    }

    if (input.createdFrom) {
      conditions.push(gte(item.createdAt, new Date(input.createdFrom)))
    }

    if (input.createdTo) {
      conditions.push(lte(item.createdAt, new Date(input.createdTo)))
    }

    if (input.inOutfitsOnly) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${outfitItem}
          WHERE ${outfitItem.itemId} = ${item.id}
        )`
      )
    }

    if (input.neverWorn) {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${outfitItem} oi
          JOIN ${outfit} o ON o.id = oi.outfit_id
          WHERE oi.item_id = ${item.id}
            AND o.wear_date IS NOT NULL
        )`
      )
    }

    if (input.wornWithItemId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${outfitItem} oi1
          JOIN ${outfitItem} oi2 ON oi1.outfit_id = oi2.outfit_id
          JOIN ${outfit} o ON o.id = oi1.outfit_id
          WHERE oi1.item_id = ${item.id}
            AND oi2.item_id = ${input.wornWithItemId}
            AND o.wear_date IS NOT NULL
        )`
      )
    }

    if (input.wornBetween) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${outfitItem} oi
          JOIN ${outfit} o ON o.id = oi.outfit_id
          WHERE oi.item_id = ${item.id}
            AND o.wear_date IS NOT NULL
            AND o.wear_date >= ${input.wornBetween.startDate}::date
            AND o.wear_date <= ${input.wornBetween.endDate}::date
        )`
      )
    }

    if (input.taggedWithAllTagIds && input.taggedWithAllTagIds.length > 0) {
      for (const tagId of input.taggedWithAllTagIds) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${outfitItem} oi
            JOIN ${outfit} o ON o.id = oi.outfit_id
            JOIN ${outfitTag} ot ON ot.outfit_id = o.id
            WHERE oi.item_id = ${item.id}
              AND o.wear_date IS NOT NULL
              AND ot.tag_id = ${tagId}
          )`
        )
      }
    }

    if (input.taggedWithAnyTagIds && input.taggedWithAnyTagIds.length > 0) {
      const tagConditions = input.taggedWithAnyTagIds.map(
        (tagId) =>
          sql`EXISTS (
            SELECT 1 FROM ${outfitItem} oi
            JOIN ${outfit} o ON o.id = oi.outfit_id
            JOIN ${outfitTag} ot ON ot.outfit_id = o.id
            WHERE oi.item_id = ${item.id}
              AND o.wear_date IS NOT NULL
              AND ot.tag_id = ${tagId}
          )`
      )
      conditions.push(or(...tagConditions)!)
    }

    if (input.taggedWithAllTagNames && input.taggedWithAllTagNames.length > 0) {
      for (const tagName of input.taggedWithAllTagNames) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${outfitItem} oi
            JOIN ${outfit} o ON o.id = oi.outfit_id
            JOIN ${outfitTag} ot ON ot.outfit_id = o.id
            JOIN ${tag} t ON t.id = ot.tag_id
            WHERE oi.item_id = ${item.id}
              AND o.wear_date IS NOT NULL
              AND LOWER(t.name) = ${tagName.toLowerCase()}
          )`
        )
      }
    }

    if (input.taggedWithAnyTagNames && input.taggedWithAnyTagNames.length > 0) {
      const tagConditions = input.taggedWithAnyTagNames.map(
        (tagName) =>
          sql`EXISTS (
            SELECT 1 FROM ${outfitItem} oi
            JOIN ${outfit} o ON o.id = oi.outfit_id
            JOIN ${outfitTag} ot ON ot.outfit_id = o.id
            JOIN ${tag} t ON t.id = ot.tag_id
            WHERE oi.item_id = ${item.id}
              AND o.wear_date IS NOT NULL
              AND LOWER(t.name) = ${tagName.toLowerCase()}
          )`
      )
      conditions.push(or(...tagConditions)!)
    }

    const baseQuery = this.getItemQuery(and(...conditions))

    let orderedQuery = baseQuery

    if (input.sortBy) {
      switch (input.sortBy) {
        case 'name':
          orderedQuery = baseQuery.then((items) =>
            items.sort((a, b) =>
              input.sortOrder === 'desc'
                ? b.name.localeCompare(a.name)
                : a.name.localeCompare(b.name)
            )
          )
          break
        case 'brand':
          orderedQuery = baseQuery.then((items) =>
            items.sort((a, b) => {
              const brandA = a.brand || ''
              const brandB = b.brand || ''
              return input.sortOrder === 'desc'
                ? brandB.localeCompare(brandA)
                : brandA.localeCompare(brandB)
            })
          )
          break
        case 'createdAt':
          orderedQuery = baseQuery.then((items) =>
            items.sort((a, b) =>
              input.sortOrder === 'desc'
                ? b.createdAt.getTime() - a.createdAt.getTime()
                : a.createdAt.getTime() - b.createdAt.getTime()
            )
          )
          break
      }
    }

    let results = await orderedQuery

    // Handle pagination
    if (input.page !== undefined && input.limit !== undefined) {
      const offset = input.page * input.limit
      results = results.slice(offset, offset + input.limit)
    } else if (input.limit !== undefined) {
      results = results.slice(0, input.limit)
    }

    return results
  }
}
