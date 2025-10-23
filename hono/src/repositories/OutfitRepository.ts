import { and, eq, gte, inArray, sql } from 'drizzle-orm'

import { item, outfit, outfitItem, outfitTag } from '../schema'
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
}
