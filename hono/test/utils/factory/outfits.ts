import { faker } from '@faker-js/faker'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../../src/schema'
import { outfits } from '../../../src/schema'

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

  async store(db_url: string) {
    const db = drizzle(postgres(db_url), { schema })
    await db
      .insert(outfits)
      .values({
        id: this.id,
        rating: this.rating,
        wearDate: this.wearDate,
        authorUsername: this.authorUsername,
      })
      .onConflictDoNothing()
  }

  formatAPI(): OutfitAPI {
    return {
      id: this.id,
      rating: this.rating,
      wearDate: this.wearDate.toISOString(),
      authorUsername: this.authorUsername,
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
      rating: this.rating,
      wearDate: this.wearDate.toISOString(),
    }
  }

  rating: number
  wearDate: Date
}
