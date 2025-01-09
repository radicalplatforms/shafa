import { faker } from '@faker-js/faker'
import { outfits } from '../../../src/schema'
import { instance } from '../db'

export interface Outfit {
  id: string
  rating: number
  wearDate: Date
  authorUsername: string
}

export interface OutfitAPI {
  id: string
  rating: number
  wearDate: string
  authorUsername: string
}

export interface OutfitSuggestionAPI extends OutfitAPI {
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
      recently_worn_items: number
      core_items: string[]
    }
  }
}

export class OutfitFactory implements Outfit {
  constructor(seed?: number, options?: Partial<Outfit> | OutfitAPI) {
    faker.seed(seed ?? undefined)
    this.id = options?.id
      ? (options.id as string)
      : faker.string.alphanumeric({ length: 24, casing: 'lower' })
    this.rating = options?.rating
      ? (options.rating as number)
      : faker.number.int({ min: 0, max: 4 })
    this.wearDate = options?.wearDate
      ? new Date(options.wearDate as Date)
      : new Date(faker.date.past().toISOString().split('T')[0])
    this.authorUsername = options?.authorUsername
      ? (options.authorUsername as string)
      : faker.internet.userName()
  }

  async store(name: string, port: number) {
    const db = instance(name, port)
    await db.insert(outfits).values(this).onConflictDoNothing()
  }

  formatAPI(): OutfitAPI {
    return {
      ...this,
      wearDate: this.wearDate.toISOString(),
    }
  }

  id: string
  rating: number
  wearDate: Date
  authorUsername: string
}

export interface PartialOutfit {
  rating: number
  wearDate: Date
}

export interface PartialOutfitAPI {
  rating: number
  wearDate: string
}

export class PartialOutfitFactory implements PartialOutfit {
  constructor(seed?: number, options?: Partial<PartialOutfit>) {
    faker.seed(seed ?? undefined)
    this.rating = options?.rating || faker.number.int({ min: 0, max: 4 })
    this.wearDate = options?.wearDate || new Date(faker.date.past().toISOString().split('T')[0])
  }

  formatAPI(): PartialOutfitAPI {
    return {
      ...this,
      wearDate: this.wearDate.toISOString(),
    }
  }

  rating: number
  wearDate: Date
}
