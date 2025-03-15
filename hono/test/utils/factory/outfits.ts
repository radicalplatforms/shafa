import { faker } from '@faker-js/faker'

import { outfits } from '../../../src/schema'
import { instance } from '../db'

export interface Outfit {
  id: string
  rating: number
  wearDate: Date
  userId: string
}

export interface OutfitAPI {
  id: string
  rating: number
  wearDate: string
  userId: string
}

export interface OutfitSuggestionAPI extends OutfitAPI {
  scoring_details: {
    ratingScore: number
    timeScore: number
    frequencyScore: number
    total_score: number
    rawData: {
      daysSinceWorn: number
      itemCount: number
      nonAccessoryItemCount: number
      wearCount: number
      avgItemFreshness: string
      minItemFreshness: string
      typeWeightedFreshness: string
      recentlyWornItems: number
      outfitFreshness: string
      wardrobeRatios: {
        layer: number
        top: number
        bottom: number
        footwear: number
      }
    }
  }
  totalScore: number
}

export class OutfitFactory implements Outfit {
  constructor(seed?: number, options?: Partial<Outfit> | OutfitAPI) {
    faker.seed(seed ?? undefined)
    this.id = options?.id
      ? (options.id as string)
      : faker.string.alphanumeric({ length: 24, casing: 'lower' })
    this.rating = options?.rating
      ? (options.rating as number)
      : faker.number.int({ min: 0, max: 2 })
    this.wearDate = options?.wearDate
      ? new Date(options.wearDate as Date)
      : new Date(faker.date.past().toISOString().split('T')[0])
    this.userId = options?.userId ? (options.userId as string) : faker.internet.userName()
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
  userId: string
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
    this.rating = options?.rating || faker.number.int({ min: 0, max: 2 })
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
