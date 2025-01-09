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
  id: string
  itemType: 'layer' | 'top' | 'bottom' | 'footwear' | 'accessory'
}

export interface Outfit {
  id: string
  rating: number
  wearDate: string
  authorUsername: string
  itemsToOutfits: ItemToOutfit[]
}

export interface OutfitCreate {
  rating: number
  wearDate: string
  itemIdsTypes: ItemToOutfit[]
}

