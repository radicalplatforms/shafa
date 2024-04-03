import { itemTypeEnum } from '../../../src/schema/schema'
import { ItemFactory, type ItemType } from '../factory/items'
import { ItemToOutfitFactory } from '../factory/items-outfits'
import { OutfitFactory } from '../factory/outfits'

export default async function (
  db_name: string,
  db_port: number
): Promise<[ItemFactory[], OutfitFactory[], ItemToOutfitFactory[]]> {
  const items: ItemFactory[] = []
  const outfits: OutfitFactory[] = []
  const items_to_outfits: ItemToOutfitFactory[] = []

  // Insert 5 items for user rak3rman
  for (let i = 0; i < 5; i++) {
    // Create item and push to db
    items[i] = new ItemFactory(i, {
      type: itemTypeEnum[i % 5] as ItemType,
      authorUsername: 'rak3rman',
    })
    await items[i].store(db_name, db_port)
  }

  // Create outfits and map items
  for (let i = 0; i < 1; i++) {
    // Create outfit and push to db
    outfits[i] = new OutfitFactory(i, {
      authorUsername: 'rak3rman',
    })
    await outfits[i].store(db_name, db_port)
    // Add 5 items to outfit
    for (let j = 0; j < items.length; j++) {
      const newItemToOutfit = new ItemToOutfitFactory(undefined, {
        itemId: items[j].id,
        outfitId: outfits[i].id,
        itemType: itemTypeEnum[j % 5] as ItemType,
      })
      await newItemToOutfit.store(db_name, db_port)
      items_to_outfits.push(newItemToOutfit)
    }
  }

  return [items, outfits, items_to_outfits]
}
