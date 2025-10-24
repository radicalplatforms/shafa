import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm'

import { item, outfit, outfitItem, outfitTag, tag } from '../schema'
import type { DBVariables } from '../utils/inject-db'

export interface OutfitWithDetails {
  id: string
  rating: number
  wearDate: string | null
  locationLatitude: number | null
  locationLongitude: number | null
  userId: string
  outfitItems: Array<{
    itemId: string
    itemType: string
    item?: any
    freshness?: number
  }>
  outfitTags: Array<{
    tagId: string
    status: string
    tag?: any
  }>
  scoringDetails?: any
  totalScore?: number
}

export interface OutfitPaginationOptions {
  page?: number
  size?: number
}

export interface OutfitSuggestionsOptions {
  page?: number
  size?: number
  tagId?: string
}

export interface OutfitSearchInput {
  text?: string
  tagIdsAny?: string[]
  tagNamesAny?: string[]
  tagIdsAll?: string[]
  tagNamesAll?: string[]
  containsItemId?: string
  minRating?: '0' | '1' | '2'
  ratingIn?: Array<'0' | '1' | '2'>
  wearDateBetween?: { startDate: string; endDate: string }
  withItems?: boolean
  sortBy?: 'wearDate' | 'rating'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  page?: number
}

export class OutfitRepository {
  constructor(private db: DBVariables['db']) {}

  async findAll(userId: string, options?: OutfitPaginationOptions) {
    const pageNumber = options?.page || 0
    const pageSize = options?.size || 10

    return this.db.query.outfit.findMany({
      where: and(
        eq(outfit.userId, userId),
        sql`${outfit.wearDate} IS NOT NULL` // Exclude ghost outfits
      ),
      with: {
        outfitItems: {
          columns: {
            outfitId: false,
          },
          orderBy: (outfitItems, { asc }) => [asc(outfitItems.itemType)],
        },
        outfitTags: {
          columns: {
            outfitId: false,
          },
        },
      },
      orderBy: (outfit, { desc }) => [desc(outfit.wearDate)],
      offset: pageNumber * pageSize,
      limit: pageSize + 1,
    })
  }

  async findEligibleForSuggestions(userId: string, minRating: number = 1) {
    return this.db.query.outfit.findMany({
      where: and(eq(outfit.userId, userId), gte(outfit.rating, minRating)),
      with: {
        outfitItems: {
          columns: {
            outfitId: true,
            itemId: true,
            itemType: true,
          },
        },
        outfitTags: {
          columns: {
            outfitId: true,
            tagId: true,
            status: true,
          },
        },
      },
      orderBy: (outfits, { desc }) => [desc(outfit.wearDate)],
    })
  }

  async findWithFullDetails(userId: string, outfitIds: string[]) {
    return this.db.query.outfit.findMany({
      where: inArray(outfit.id, outfitIds),
      with: {
        outfitItems: {
          columns: {
            outfitId: false,
          },
          orderBy: (outfitItems, { asc }) => [asc(outfitItems.itemType)],
        },
        outfitTags: {
          columns: {
            outfitId: false,
          },
        },
      },
    })
  }

  async create(userId: string, data: any) {
    return this.db.transaction(async (tx) => {
      // Check if any of the items being used are archived
      const itemIds = data.itemIdsTypes.map((e: any) => e.id)

      if (itemIds.length > 0) {
        // Find which of these items (if any) are currently withheld or retired
        const unavailableItems = await tx.query.item.findMany({
          where: and(
            inArray(item.id, itemIds),
            sql`item.status != 'available'`,
            eq(item.userId, userId)
          ),
          columns: {
            id: true,
          },
        })

        // If any unavailable items were found, make them available
        if (unavailableItems.length > 0) {
          const unavailableItemIds = unavailableItems.map((item) => item.id)

          // Make the items available
          await tx
            .update(item)
            .set({ status: 'available' })
            .where(inArray(item.id, unavailableItemIds))
        }
      }

      const outfitData = {
        ...data,
        userId,
      }

      const newOutfit = (
        await tx.insert(outfit).values(outfitData).onConflictDoNothing().returning()
      )[0]

      // Insert item to outfit relationships
      await tx.insert(outfitItem).values(
        data.itemIdsTypes.map((e: any) => ({
          itemId: e.id,
          outfitId: newOutfit.id,
          itemType: e.itemType,
        }))
      )

      // Insert tag to outfit relationships
      if (data.tagIds.length > 0) {
        // Filter out virtual tags (this logic should be moved to service layer)
        const realTagIds = data.tagIds.filter((tagId: string) => !tagId.startsWith('virtual_'))

        if (realTagIds.length > 0) {
          await tx.insert(outfitTag).values(
            realTagIds.map((e: string) => ({
              tagId: e,
              outfitId: newOutfit.id,
              status: 'manually_assigned',
            }))
          )
        }
      }

      return newOutfit
    })
  }

  async delete(userId: string, outfitId: string) {
    return (
      await this.db
        .delete(outfit)
        .where(and(eq(outfit.id, outfitId), eq(outfit.userId, userId)))
        .returning()
    )[0]
  }

  async getItemLastWornDates(userId: string) {
    return this.db.execute(
      sql`
        SELECT 
          io.item_id,
          MAX(o.wear_date) as last_worn_date
        FROM 
          outfit_item io
        JOIN 
          outfit o ON o.id = io.outfit_id
        WHERE 
          o.user_id = ${userId}
        GROUP BY 
          io.item_id
      `
    )
  }

  async getAvailableItems(userId: string) {
    return this.db.query.item.findMany({
      where: and(eq(sql`item.user_id`, userId), eq(item.status, 'available')),
      columns: {
        id: true,
        type: true,
      },
    })
  }

  async getUnavailableItems(userId: string) {
    return this.db.query.item.findMany({
      where: and(eq(sql`item.user_id`, userId), sql`item.status != 'available'`),
      columns: {
        id: true,
      },
    })
  }

  async search(userId: string, input: OutfitSearchInput) {
    const conditions: any[] = [eq(outfit.userId, userId), sql`${outfit.wearDate} IS NOT NULL`]

    if (input.containsItemId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${outfitItem} oi
          WHERE oi.outfit_id = ${outfit.id}
            AND oi.item_id = ${input.containsItemId}
        )`
      )
    }

    if (input.tagIdsAny && input.tagIdsAny.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${outfitTag} ot
          WHERE ot.outfit_id = ${outfit.id}
            AND ot.tag_id IN ${input.tagIdsAny}
        )`
      )
    }

    if (input.tagNamesAny && input.tagNamesAny.length > 0) {
      const tagConditions = input.tagNamesAny.map(
        (tagName) =>
          sql`EXISTS (
            SELECT 1 FROM ${outfitTag} ot
            JOIN ${tag} t ON t.id = ot.tag_id
            WHERE ot.outfit_id = ${outfit.id}
              AND LOWER(t.name) = ${tagName.toLowerCase()}
          )`
      )
      conditions.push(or(...tagConditions))
    }

    if (input.tagIdsAll && input.tagIdsAll.length > 0) {
      for (const tagId of input.tagIdsAll) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${outfitTag} ot
            WHERE ot.outfit_id = ${outfit.id}
              AND ot.tag_id = ${tagId}
          )`
        )
      }
    }

    if (input.tagNamesAll && input.tagNamesAll.length > 0) {
      for (const tagName of input.tagNamesAll) {
        conditions.push(
          sql`EXISTS (
            SELECT 1 FROM ${outfitTag} ot
            JOIN ${tag} t ON t.id = ot.tag_id
            WHERE ot.outfit_id = ${outfit.id}
              AND LOWER(t.name) = ${tagName.toLowerCase()}
          )`
        )
      }
    }

    if (input.minRating !== undefined) {
      conditions.push(gte(outfit.rating, parseInt(input.minRating)))
    }

    if (input.ratingIn && input.ratingIn.length > 0) {
      conditions.push(
        inArray(
          outfit.rating,
          input.ratingIn.map((r) => parseInt(r))
        )
      )
    }

    if (input.wearDateBetween) {
      conditions.push(
        and(
          gte(outfit.wearDate, sql`${input.wearDateBetween.startDate}::date`),
          lte(outfit.wearDate, sql`${input.wearDateBetween.endDate}::date`)
        )!
      )
    }

    const queryBuilder = this.db.query.outfit.findMany({
      where: and(...conditions),
      with: input.withItems
        ? {
            outfitItems: {
              columns: { outfitId: false },
              with: { item: true },
              orderBy: (outfitItems, { asc }) => [asc(outfitItems.itemType)],
            },
            outfitTags: {
              columns: { outfitId: false },
              with: { tag: true },
            },
          }
        : {
            outfitTags: {
              columns: { outfitId: false },
              with: { tag: true },
            },
          },
      orderBy: (outfit, { desc }) => [desc(outfit.wearDate)], // Same ordering as findAll
    })

    let results = await queryBuilder

    if (input.sortBy) {
      results = results.sort((a, b) => {
        let comparison = 0
        if (input.sortBy === 'wearDate') {
          const dateA = a.wearDate ? new Date(a.wearDate).getTime() : 0
          const dateB = b.wearDate ? new Date(b.wearDate).getTime() : 0
          comparison = dateB - dateA
        } else if (input.sortBy === 'rating') {
          comparison = b.rating - a.rating
        }
        return input.sortOrder === 'asc' ? -comparison : comparison
      })
    }

    // Handle pagination
    if (input.page !== undefined && input.limit !== undefined) {
      const offset = input.page * input.limit
      results = results.slice(offset, offset + input.limit)
    } else if (input.limit !== undefined) {
      results = results.slice(0, input.limit)
    }

    return results
  }

  async findOutfitItems(userId: string, outfitId: string) {
    const result = await this.db.query.outfit.findFirst({
      where: and(eq(outfit.id, outfitId), eq(outfit.userId, userId)),
      with: {
        outfitItems: {
          with: {
            item: true,
          },
        },
      },
    })

    return result?.outfitItems || []
  }
}
