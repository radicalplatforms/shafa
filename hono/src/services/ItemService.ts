import type {
  ItemRepository,
  ItemSearchInput,
  ItemWithAggregatedTags,
} from '../repositories/ItemRepository'
import type { item } from '../schema'
import { createLogger } from '../utils/logger'
import type { PaginationResult } from '../utils/pagination'

export type ItemQueryVariables = {
  limit?: number
  offset?: number
}

const logger = createLogger('ItemService')

export class ItemService {
  constructor(private itemRepository: ItemRepository) {}

  /**
   * Get all items for a user with search and pagination.
   *
   * @param {string} userId — The user's ID
   * @param {string} search — Optional search term
   * @param {ItemQueryVariables} variables — Optional query variables
   * @returns {Promise<PaginationResult<ItemWithAggregatedTags>>} — Promise resolving to paginated items
   */
  async items(
    userId: string,
    search?: string,
    variables?: ItemQueryVariables
  ): Promise<PaginationResult<ItemWithAggregatedTags>> {
    logger.debug('Getting items', { userId, search, variables })
    const pagination =
      variables?.limit !== undefined
        ? {
            offset: variables.offset ?? 0,
            limit: variables.limit,
          }
        : undefined

    const searchResult = await this.itemRepository.search(userId, {
      text: search,
      pagination,
    })

    const items = searchResult.data

    // Sort by status (available first, then withheld, then retired), then lastWornAt (nulls first), then name
    const sortedItems = items.sort(
      (a: ItemWithAggregatedTags, b: ItemWithAggregatedTags) => {
        // First sort by status
        const statusOrder: Record<string, number> = {
          available: 0,
          withheld: 1,
          retired: 2,
        }
        const statusCompare = statusOrder[a.status] - statusOrder[b.status]
        if (statusCompare !== 0) return statusCompare

        // Then use the existing sort logic for items with the same status
        if (!a.lastWornAt && !b.lastWornAt) return a.name.localeCompare(b.name)
        if (!a.lastWornAt) return -1
        if (!b.lastWornAt) return 1
        const dateCompare =
          new Date(a.lastWornAt).getTime() - new Date(b.lastWornAt).getTime()
        return dateCompare === 0 ? a.name.localeCompare(b.name) : dateCompare
      }
    )

    logger.debug('Items retrieved', { userId, count: sortedItems.length })
    return {
      data: sortedItems,
      pagination: searchResult.pagination,
    }
  }

  /**
   * Get a specific item by ID for a user.
   *
   * @param {string} userId — The user's ID
   * @param {string} itemId — The ID of the item to retrieve
   * @returns {Promise<ItemWithAggregatedTags | null>} — Promise resolving to the item with aggregated tags or null
   */
  async itemById(
    userId: string,
    itemId: string
  ): Promise<ItemWithAggregatedTags | null> {
    logger.debug('Getting item by ID', { userId, itemId })
    return this.itemRepository.findById(userId, itemId)
  }

  /**
   * Create a new item for a user.
   *
   * @param {string} userId — The user's ID
   * @param {Omit<typeof item.$inferInsert, 'id' | 'createdAt' | 'userId'>} data — The item data to create
   * @returns {Promise<typeof item.$inferSelect>} — Promise resolving to the created item
   */
  async createItem(
    userId: string,
    data: Omit<typeof item.$inferInsert, 'id' | 'createdAt' | 'userId'>
  ): Promise<typeof item.$inferSelect> {
    logger.debug('Creating item', { userId })
    return this.itemRepository.create(userId, data)
  }

  /**
   * Update an existing item for a user.
   *
   * @param {string} userId — The user's ID
   * @param {string} itemId — The ID of the item to update
   * @param {Partial<Omit<typeof item.$inferInsert, 'id' | 'createdAt' | 'userId' | 'type'>>} data — The item data to update
   * @returns {Promise<typeof item.$inferSelect>} — Promise resolving to the updated item
   */
  async updateItem(
    userId: string,
    itemId: string,
    data: Partial<
      Omit<typeof item.$inferInsert, 'id' | 'createdAt' | 'userId' | 'type'>
    >
  ): Promise<typeof item.$inferSelect> {
    logger.debug('Updating item', { userId, itemId })
    return this.itemRepository.update(userId, itemId, data)
  }

  /**
   * Delete an item for a user.
   *
   * @param {string} itemId — The ID of the item to delete
   * @returns {Promise<typeof item.$inferSelect>} — Promise resolving to the deleted item
   */
  async deleteItem(
    userId: string,
    itemId: string
  ): Promise<typeof item.$inferSelect> {
    logger.debug('Deleting item', { userId, itemId })
    return this.itemRepository.delete(userId, itemId)
  }

  /**
   * Search items with advanced filtering options.
   *
   * @param {string} userId — The user's ID
   * @param {ItemSearchInput} input — The search criteria and filters
   * @returns {Promise<ItemWithAggregatedTags[]>} — Promise resolving to array of items with aggregated tags
   * @example searchItems(userId, { text: "blue", typeIn: ["top"], statusIn: ["available"] })
   */
  async searchItems(
    userId: string,
    input: ItemSearchInput
  ): Promise<ItemWithAggregatedTags[]> {
    logger.debug('Searching items', { userId, input })
    const result = await this.itemRepository.search(userId, input)
    return result.data
  }
}
