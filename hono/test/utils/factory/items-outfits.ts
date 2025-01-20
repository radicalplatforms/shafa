import { faker } from '@faker-js/faker'
import { itemTypeEnum, itemsToOutfits } from '../../../src/schema'
import { instance } from '../db'
import type { ItemFactory, ItemType } from './items'
import type { OutfitFactory } from './outfits'

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
  }

  itemId: string
  outfitId: string
  itemType: ItemType
}

export function itemsComputeLastWornAt(
  items: ItemFactory[],
  outfits: OutfitFactory[],
  itemsToOutfits: ItemToOutfitFactory[]
): ItemFactory[] {
  return items
    .map((item) => {
      const relevantOutfits = outfits
        .filter((outfit) =>
          itemsToOutfits.some((io) => io.outfitId === outfit.id && io.itemId === item.id)
        )
        .sort((a, b) => {
          if (!a.wearDate) return -1
          if (!b.wearDate) return 1
          return b.wearDate.getTime() - a.wearDate.getTime()
        })

      item.lastWornAt =
        relevantOutfits.length > 0 ? relevantOutfits[0].wearDate.toISOString().split('T')[0] : null
      return item
    })
    .sort((a, b) => {
      if (!a.lastWornAt && !b.lastWornAt) return a.name.localeCompare(b.name)
      if (!a.lastWornAt) return -1
      if (!b.lastWornAt) return 1
      const dateCompare = new Date(a.lastWornAt).getTime() - new Date(b.lastWornAt).getTime()
      return dateCompare === 0 ? a.name.localeCompare(b.name) : dateCompare
    })
}
