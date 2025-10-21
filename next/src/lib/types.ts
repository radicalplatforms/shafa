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
