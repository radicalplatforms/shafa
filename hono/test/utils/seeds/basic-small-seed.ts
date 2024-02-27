import { itemTypeEnum } from '../../../src/schema'
import { type ItemType, ItemFactory } from '../factory/items'
import { ItemToOutfitFactory } from '../factory/items-outfits'
import { OutfitFactory } from '../factory/outfits'

export default async function (
  db_url: string
): Promise<[ItemFactory[], OutfitFactory[], ItemToOutfitFactory[]]> {
  const items: ItemFactory[] = []
  const outfits: OutfitFactory[] = []
  const items_to_outfits: ItemToOutfitFactory[] = []

  // Insert 5 items for user jdoe
  for (let i = 0; i < 5; i++) {
    // Create item and push to db
    items[i] = new ItemFactory(i, {
      type: itemTypeEnum[i % 5] as ItemType,
      authorUsername: 'jdoe',
    })
    await items[i].push(db_url)
  }

  // Create outfits and map items
  for (let i = 0; i < 1; i++) {
    // Create outfit and push to db
    outfits[i] = new OutfitFactory(i, {
      authorUsername: 'jdoe',
    })
    await outfits[i].push(db_url)
    // Add 5 items to outfit
    for (let j = 0; j < items.length; j++) {
      const newItemToOutfit = new ItemToOutfitFactory({
        itemId: items[j].id,
        outfitId: outfits[i].id,
        itemType: itemTypeEnum[j % 5] as ItemType,
      })
      await newItemToOutfit.push(db_url)
      items_to_outfits.push(newItemToOutfit)
    }
  }

  return [items, outfits, items_to_outfits]
}
