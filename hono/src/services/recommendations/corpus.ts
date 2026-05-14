import { eq } from 'drizzle-orm'

import { item, outfit } from '../../schema'
import type { DBVariables } from '../../utils/inject-db'
import type { AvailableCounts, CorpusOutfit, ItemType } from './core/types'

export type Corpus = {
  availableItems: { id: string; type: ItemType; userRating: number }[]
  availableItemIds: Set<string>
  outfits: CorpusOutfit[]
  lastWornByItem: Map<string, Date>
  availableCounts: AvailableCounts
  ratedOutfitCount: number
}

export const loadUserCorpus = async (db: DBVariables['db'], userId: string): Promise<Corpus> => {
  const allItems = await db.query.item.findMany({
    where: eq(item.userId, userId),
    columns: { id: true, type: true, rating: true, status: true },
  })

  const availableItems = allItems
    .filter((i) => i.status === 'available')
    .map((i) => ({ id: i.id, type: i.type as ItemType, userRating: i.rating }))
  const availableItemIds = new Set(availableItems.map((i) => i.id))

  const availableCounts: AvailableCounts = {
    layer: 0,
    top: 0,
    bottom: 0,
    footwear: 0,
    accessory: 0,
  }
  for (const i of availableItems) availableCounts[i.type]++

  const outfitsData = await db.query.outfit.findMany({
    where: eq(outfit.userId, userId),
    with: {
      outfitItems: { columns: { itemId: true } },
    },
  })

  const outfits: CorpusOutfit[] = outfitsData.map((o) => ({
    id: o.id,
    rating: o.rating as 0 | 1 | 2,
    wearDate: o.wearDate ? new Date(o.wearDate) : null,
    itemIds: o.outfitItems.map((io) => io.itemId),
  }))

  const lastWornByItem = new Map<string, Date>()
  for (const o of outfits) {
    if (!o.wearDate) continue
    for (const id of o.itemIds) {
      const existing = lastWornByItem.get(id)
      if (!existing || o.wearDate > existing) lastWornByItem.set(id, o.wearDate)
    }
  }

  const ratedOutfitCount = outfits.filter((o) => o.rating >= 1).length

  return {
    availableItems,
    availableItemIds,
    outfits,
    lastWornByItem,
    availableCounts,
    ratedOutfitCount,
  }
}
