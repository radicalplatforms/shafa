export type ItemStatus = 'available' | 'withheld' | 'retired'

export const ITEM_STATUS = {
  AVAILABLE: 'available' as const,
  WITHHELD: 'withheld' as const,
  RETIRED: 'retired' as const,
} as const

export const ITEM_STATUS_LABELS = {
  [ITEM_STATUS.AVAILABLE]: 'Available',
  [ITEM_STATUS.WITHHELD]: 'Withheld',
  [ITEM_STATUS.RETIRED]: 'Retired',
} as const

// Agent response types
export type ComposedOutfitItem = {
  itemId: string
  itemType: 'layer' | 'top' | 'bottom' | 'footwear' | 'accessory'
}

export type ComposedOutfit = {
  items: ComposedOutfitItem[]
  tagIds?: string[]
  reasoning?: string
}

export type AgentMessage = 
  | { type: 'text'; content: string }
  | { type: 'outfits'; content: string[] }
  | { type: 'items'; content: string[] }
  | { type: 'composed_outfits'; content: ComposedOutfit[] }

export type AgentResponse = {
  messages: AgentMessage[]
}
