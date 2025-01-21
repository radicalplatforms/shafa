// Define the base types
export interface Item {
  id: string
  name: string
  brand: string
  photoUrl: string
  type: string
  rating: number
  authorUsername: string
  createdAt: string
  lastWornAt?: string | null
}

export type ItemToOutfit = {
  itemId: string
  outfitId: string
  itemType: string
  item?: Item
}

export type OutfitCreate = {
  rating?: number
  wearDate: Date
  itemIdsTypes: Array<{
    id: string
    itemType: string
  }>
}

export interface Outfit {
  id: string
  wearDate: string
  rating: number
  itemsToOutfits: ItemToOutfit[]
  createdAt: string
}

export interface OutfitSuggestion {
  id: string
  rating: number
  itemsToOutfits: ItemToOutfit[]
  scoring_details: {
    base_score: number
    items_score: number
    time_factor: number
    frequency_score: number
    day_of_week_score: number
    seasonal_score: number
    total_score: number
    raw_data: {
      wear_count: number
      days_since_worn: number
      same_day_count: number
      seasonal_relevance: number
      core_items: string[]
    }
  }
}