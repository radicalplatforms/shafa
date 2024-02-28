import { faker } from '@faker-js/faker'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../../src/schema'
import { itemTypeEnum, itemsToOutfits } from '../../../src/schema'
import type { ItemType } from './items'

export interface ItemToOutfit {
  itemId: string
  outfitId: string
  itemType: ItemType
}

export class ItemToOutfitFactory implements ItemToOutfit {
  constructor(seed: number | undefined, options: ItemToOutfit | Omit<ItemToOutfit, 'itemType'>) {
    faker.seed(seed)
    this.itemId = options.itemId
    this.outfitId = options.outfitId
    this.itemType =
      'itemType' in options
        ? options.itemType
        : (faker.helpers.arrayElement(itemTypeEnum) as ItemType)
  }

  async push(db_url: string) {
    const db = drizzle(postgres(db_url), { schema })
    await db
      .insert(itemsToOutfits)
      .values({
        itemId: this.itemId,
        outfitId: this.outfitId,
        itemType: this.itemType,
      })
      .onConflictDoNothing()
  }

  itemId: string
  outfitId: string
  itemType: ItemType
}
