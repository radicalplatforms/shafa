import type {
  ItemRepository,
  ItemSearchInput,
  ItemWithAggregatedTags,
} from '../repositories/ItemRepository'

export class ItemService {
  constructor(private itemRepository: ItemRepository) {}

  async getAllItems(
    userId: string,
    pagination?: { page?: number; size?: number },
    search?: string
  ): Promise<{
    items: ItemWithAggregatedTags[]
    last_page: boolean
  }> {
    const pageNumber = pagination?.page
    const pageSize = pagination?.size

    const itemsData = await this.itemRepository.search(userId, { text: search }).then((items) => {
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

    return {
      items: itemsData,
      last_page,
    }
  }

  async getItemById(userId: string, itemId: string): Promise<ItemWithAggregatedTags | null> {
    return this.itemRepository.findById(userId, itemId)
  }

  async createItem(userId: string, data: any) {
    return this.itemRepository.create(userId, data)
  }

  async updateItem(userId: string, itemId: string, data: any) {
    return this.itemRepository.update(userId, itemId, data)
  }

  async deleteItem(userId: string, itemId: string) {
    return this.itemRepository.delete(userId, itemId)
  }

  /**
   * Search wardrobe items with rich filtering.
   *
   * @param {string} userId - The user's ID
   * @param {ItemSearchInput} input - Search filters
   * @returns {Promise<ItemWithAggregatedTags[]>} - Matching items
   * @example searchItems(userId, { text: "blue", typeIn: ["top"], statusIn: ["available"] })
   */
  async searchItems(userId: string, input: ItemSearchInput): Promise<ItemWithAggregatedTags[]> {
    return this.itemRepository.search(userId, input)
  }
}
