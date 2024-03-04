import { faker } from '@faker-js/faker'
import { itemTypeEnum, itemsExtended, itemsToOutfits } from '../../../src/schema'
import { instance } from '../db'
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

  async store(name: string, port: number) {
    const db = instance(name, port)
    await db.insert(itemsToOutfits).values(this).onConflictDoNothing()
    await db.refreshMaterializedView(itemsExtended)
  }

  itemId: string
  outfitId: string
  itemType: ItemType
}
