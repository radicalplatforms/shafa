export interface Item {
  id: string
  name: string
  brand: string | null
  photoUrl: string | null
  type: string
  rating: number
  createdAt: string
  authorUsername: string
}

export interface ItemToOutfit {
  itemType: string
  item: Item
}

export interface Outfit {
  id: string
  rating: number
  wearDate: string
  authorUsername: string
  itemsToOutfits: ItemToOutfit[]
}

