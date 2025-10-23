import { itemTypeEnum, tagStatusEnum } from '../../../src/schema'
import { ItemFactory, type ItemType } from '../factory/items'
import { ItemToOutfitFactory } from '../factory/items-outfits'
import { OutfitFactory } from '../factory/outfits'
import { TagFactory } from '../factory/tags'
import { TagToOutfitFactory } from '../factory/tags-outfits'

export default async function (
  db_name: string,
  db_port: number
): Promise<
  [ItemFactory[], OutfitFactory[], ItemToOutfitFactory[], TagFactory[], TagToOutfitFactory[]]
> {
  const items: ItemFactory[] = []
  const outfits: OutfitFactory[] = []
  const items_to_outfits: ItemToOutfitFactory[] = []
  const tags: TagFactory[] = []
  const tags_to_outfits: TagToOutfitFactory[] = []

  // Create tags
  for (let i = 0; i < 2; i++) {
    // Create tag and push to db
    tags[i] = new TagFactory(i, {
      userId: 'rak3rman',
    })
    await tags[i].store(db_name, db_port)
  }

  // Insert 5 items for user rak3rman
  for (let i = 0; i < 5; i++) {
    // Create item and push to db
    items[i] = new ItemFactory(i, {
      type: itemTypeEnum[i % 5] as ItemType,
      userId: 'rak3rman',
    })
    await items[i].store(db_name, db_port)
  }

  // Create outfits and map items
  for (let i = 0; i < 1; i++) {
    // Create outfit and push to db
    outfits[i] = new OutfitFactory(i, {
      userId: 'rak3rman',
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

    // Assign tag to outfit
    tags_to_outfits[i] = new TagToOutfitFactory(undefined, {
      tagId: tags[i % tags.length].id,
      outfitId: outfits[i].id,
      status: tagStatusEnum[i % 4],
    })
    await tags_to_outfits[i].store(db_name, db_port)
  }

  return [items, outfits, items_to_outfits, tags, tags_to_outfits]
}
