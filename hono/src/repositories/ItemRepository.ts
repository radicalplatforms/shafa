import type { SQL } from 'drizzle-orm'
import { and, eq, ilike, or, sql } from 'drizzle-orm'

import { item } from '../schema'
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

export interface ItemSearchOptions {
  search?: string
  type?: string
  status?: string
  page?: number
  size?: number
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

  async findAll(userId: string, options?: ItemSearchOptions): Promise<ItemWithAggregatedTags[]> {
    const whereClause = options?.search
      ? and(
          or(
            // Search in item name and brand
            ...options.search
              .toLowerCase()
              .split(/\s+/)
              .map((word) => or(ilike(item.name, `%${word}%`), ilike(item.brand, `%${word}%`))),
            // Search in aggregated tags
            ...options.search
              .toLowerCase()
              .split(/\s+/)
              .map(
                (word) =>
                  sql`EXISTS (
                  SELECT 1 FROM outfit_item oi
                  JOIN outfit o ON o.id = oi.outfit_id
                  JOIN outfit_tag ot ON ot.outfit_id = o.id
                  JOIN tag t ON t.id = ot.tag_id
                  WHERE oi.item_id = ${item.id}
                    AND o.user_id = ${userId}
                    AND o.wear_date IS NOT NULL
                    AND LOWER(t.name) LIKE ${`%${word}%`}
                )`
              )
          ),
          eq(item.userId, userId)
        )
      : eq(item.userId, userId)

    return this.getItemQuery(whereClause)
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

  async search(userId: string, query: string) {
    const searchTerm = query.toLowerCase()

    const whereClause = and(
      or(
        // Search in item name and brand
        ...searchTerm
          .split(/\s+/)
          .map((word: string) => or(ilike(item.name, `%${word}%`), ilike(item.brand, `%${word}%`))),
        // Search in aggregated tags
        ...searchTerm.split(/\s+/).map(
          (word: string) =>
            sql`EXISTS (
            SELECT 1 FROM outfit_item oi
            JOIN outfit o ON o.id = oi.outfit_id
            JOIN outfit_tag ot ON ot.outfit_id = o.id
            JOIN tag t ON t.id = ot.tag_id
            WHERE oi.item_id = ${item.id}
              AND o.user_id = ${userId}
              AND o.wear_date IS NOT NULL
              AND LOWER(t.name) LIKE ${`%${word}%`}
          )`
        )
      ),
      eq(item.userId, userId)
    )

    return this.db.query.item.findMany({
      where: whereClause,
    })
  }
}
