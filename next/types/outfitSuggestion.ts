import { ItemToOutfit } from './outfit'

export interface ScoringDetails {
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
    recently_worn_items: number
    core_items: string[]
  }
}

export interface OutfitSuggestion {
  id: string
  rating: number
  wearDate: string
  authorUsername: string
  itemsToOutfits: ItemToOutfit[]
  scoring_details: ScoringDetails
}

