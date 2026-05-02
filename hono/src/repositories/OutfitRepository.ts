import type { SQL } from 'drizzle-orm'
import { and, eq, gte, inArray, lte, or, sql } from 'drizzle-orm'

import type {
  itemTypeEnum} from '../schema';
import {
  item,
  outfit,
  outfitItem,
  outfitTag,
  tag,
} from '../schema'
import type { Database } from '../utils/inject-services'
import { createLogger } from '../utils/logger'
import type { PaginationInput, PaginationResult } from '../utils/pagination'
import { createPaginationResult } from '../utils/pagination'

const logger = createLogger('OutfitRepository')

/**
 * Type for creating a new outfit
 */
export type CreateOutfitData = Omit<
  typeof outfit.$inferInsert,
  'id' | 'userId'
> & {
  itemIdsTypes: Array<{
    id: string
    itemType: (typeof itemTypeEnum)[number]
  }>
  tagIds: string[]
}

export interface OutfitWithDetails {
  id: string
  rating: number
  wearDate: Date | null
  locationLatitude: number | null
  locationLongitude: number | null
  userId: string
  outfitItems: Array<{
    itemId: string
    itemType: string
    item?: typeof item.$inferSelect
    freshness?: number
  }>
  outfitTags: Array<{
    tagId: string
    status: string
    tag?: typeof tag.$inferSelect
  }>
  scoringDetails?: Record<string, unknown>
  totalScore?: number
}

export interface OutfitWithRelations {
  id: string
  userId: string
  rating: number
  wearDate: Date | null
  locationLatitude: number | null
  locationLongitude: number | null
  outfitItems: Array<{
    itemId: string
    itemType: string
  }>
  outfitTags: Array<{
    tagId: string
  }>
}

export interface OutfitSuggestionsOptions {
  pagination?: PaginationInput
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
  pagination?: PaginationInput
}

export class OutfitRepository {
  constructor(private db: Database) {}

  /**
   * Find all outfits for a user with pagination.
   *
   * @param {string} userId — The user's ID
   * @param {PaginationInput} pagination — Pagination options
   * @returns {Promise<PaginationResult<OutfitWithRelations>>} — Promise resolving to paginated outfits with relations
   */
  async findAll(
    userId: string,
    pagination?: PaginationInput
  ): Promise<PaginationResult<OutfitWithRelations>> {
    logger.debug('Finding all outfits for user', {
      userId,
      offset: pagination?.offset ?? 'all',
      limit: pagination?.limit ?? 'all',
    })

    // If pagination provided, use offset/limit, otherwise fetch all
    const offset = pagination?.offset ?? 0
    const limit = pagination?.limit ? pagination.limit + 1 : undefined

    const result = await this.db.query.outfit.findMany({
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
      ...(limit && { offset, limit }),
    })

    logger.debug('Outfits retrieved successfully', {
      userId,
      outfitCount: result.length,
    })

    return createPaginationResult(result, pagination)
  }

  /**
   * Find outfits eligible for suggestions based on rating.
   *
   * @param {string} userId — The user's ID
   * @param {number} minRating — Minimum rating threshold (default: 1)
   * @returns {Promise<typeof outfit.$inferSelect[]>} — Promise resolving to array of eligible outfits
   */
  async findEligibleForSuggestions(
    userId: string,
    minRating: number = 1
  ): Promise<OutfitWithDetails[]> {
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
      orderBy: (outfits, { desc }) => [desc(outfits.wearDate)],
    })
  }

  async findWithFullDetails(
    userId: string,
    outfitIds: string[]
  ): Promise<OutfitWithDetails[]> {
    return this.db.query.outfit.findMany({
      where: and(eq(outfit.userId, userId), inArray(outfit.id, outfitIds)),
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

  /**
   * Create a new outfit for a user.
   *
   * @param {string} userId — The user's ID
   * @param {CreateOutfitData} data — The outfit data to create
   * @returns {Promise<typeof outfit.$inferSelect>} — Promise resolving to the created outfit
   */
  async create(
    userId: string,
    data: CreateOutfitData
  ): Promise<typeof outfit.$inferSelect> {
    return this.db.transaction(async (tx) => {
      // Check if any of the items being used are archived
      const itemIds = data.itemIdsTypes.map((e) => e.id)

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
        await tx
          .insert(outfit)
          .values(outfitData)
          .onConflictDoNothing()
          .returning()
      )[0]

      // Insert item to outfit relationships
      await tx.insert(outfitItem).values(
        data.itemIdsTypes.map((e) => ({
          itemId: e.id,
          outfitId: newOutfit.id,
          itemType: e.itemType,
        }))
      )

      // Insert tag to outfit relationships
      if (data.tagIds.length > 0) {
        // Filter out virtual tags (this logic should be moved to service layer)
        const realTagIds = data.tagIds.filter(
          (tagId: string) => !tagId.startsWith('virtual_')
        )

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

  /**
   * Delete an outfit for a user.
   *
   * @param {string} userId — The user's ID
   * @param {string} outfitId — The ID of the outfit to delete
   * @returns {Promise<typeof outfit.$inferSelect>} — Promise resolving to the deleted outfit
   */
  async delete(
    userId: string,
    outfitId: string
  ): Promise<typeof outfit.$inferSelect> {
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
      where: and(
        eq(sql`item.user_id`, userId),
        sql`item.status != 'available'`
      ),
      columns: {
        id: true,
      },
    })
  }

  async search(
    userId: string,
    input: OutfitSearchInput
  ): Promise<PaginationResult<typeof outfit.$inferSelect>> {
    const conditions: SQL<unknown>[] = [
      eq(outfit.userId, userId),
      sql`${outfit.wearDate} IS NOT NULL`,
    ]

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
      const orCondition = or(...tagConditions)
      if (orCondition) {
        conditions.push(orCondition)
      }
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

    // Apply pagination if provided
    if (input.pagination?.limit) {
      const offset = input.pagination.offset ?? 0
      const limit = input.pagination.limit
      const paginatedResults = results.slice(offset, offset + limit + 1)
      return createPaginationResult(paginatedResults, input.pagination)
    }

    return createPaginationResult(results, input.pagination)
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
