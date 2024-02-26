import { faker } from '@faker-js/faker'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../../src/schema'
import { outfits } from '../../../src/schema'

export interface Outfit {
  id: string
  rating: number
  wearDate: string
  authorUsername: string
}

export class OutfitFactory implements Outfit {
  constructor(seed?: number, options?: Partial<Outfit>) {
    faker.seed(seed ?? undefined)
    this.id = options?.id || faker.string.alphanumeric(24)
    this.rating = options?.rating || faker.number.int({ min: 0, max: 4 })
    this.wearDate = options?.wearDate || faker.date.past().toISOString().split('T')[0]
    this.authorUsername = options?.authorUsername || faker.internet.userName()
  }

  async push(db_url: string) {
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

  id: string
  rating: number
  wearDate: string
  authorUsername: string
}

export interface PartialOutfit {
  rating: number
  wearDate: string
}

export class PartialOutfitFactory implements PartialOutfit {
  constructor(seed?: number, options?: Partial<PartialOutfit>) {
    faker.seed(seed ?? undefined)
    this.rating = options?.rating || faker.number.int({ min: 0, max: 4 })
    this.wearDate = options?.wearDate || faker.date.past().toISOString().split('T')[0]
  }

  rating: number
  wearDate: string
}
