import React from 'react'
import { SelectableItem, itemTypeIcons } from '@/components/SelectableItem'
import { useItems } from '@/lib/client'
import type { ItemsResponse } from '@/lib/client'
import type { ItemStatus } from '@/lib/types'

type ItemType = keyof typeof itemTypeIcons

/**
 * @deprecated Use SelectableItemList instead for better abstraction and cleaner API
 */

interface ItemListContainerProps {
  items: ItemsResponse['items'] | (ItemsResponse['items'][number] & { itemType?: string; freshness?: number })[]
  coreItems?: string[]
  showLastWornAt?: boolean
  renderItem?: (item: ItemsResponse['items'][number], index: number) => React.ReactNode
  className?: string
  // Selection control
  enableSelection?: boolean
  // Selection props
  selectedItemIds?: Set<string>
  isBatchUpdating?: boolean
  statusChangingItemId?: string | null
  changingToStatus?: ItemStatus | null
  handleToggleSelection?: (itemId: string) => void
  handleClearSelection?: () => void
  handleBatchStatusChange?: (status: any) => Promise<void>
  handleStatusChange?: (itemId: string, status: any) => Promise<void>
}

export function ItemListContainer({ 
  items, 
  coreItems = [], 
  showLastWornAt = false,
  renderItem,
  className = "space-y-1",
  enableSelection = false,
  selectedItemIds = new Set(),
  isBatchUpdating = false,
  statusChangingItemId = null,
  changingToStatus = null,
  handleToggleSelection,
  handleClearSelection,
  handleBatchStatusChange,
  handleStatusChange,
}: ItemListContainerProps) {
  const { items: allItems, isError } = useItems()

  const defaultRenderItem = (item: any, index: number) => (
    <li key={item.id || `item-${index}`} className="text-sm m-0">
      <SelectableItem 
        item={item}
        itemType={(item.itemType || item.type) as ItemType}
        isCoreItem={coreItems.includes(item.id)}
        showLastWornAt={showLastWornAt}
        freshness={item.freshness}
        enableSelection={enableSelection}
        isSelected={selectedItemIds.has(item.id)}
        hasAnySelection={selectedItemIds.size > 0}
        onToggleSelection={handleToggleSelection}
        isStatusChanging={statusChangingItemId === item.id}
        changingToStatus={changingToStatus || undefined}
        onStatusChange={handleStatusChange}
      />
    </li>
  )

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>Failed to load items</p>
      </div>
    )
  }

  return (
    <ul className={className}>
      {items.map((item, index) => 
        renderItem ? renderItem(item, index) : defaultRenderItem(item, index)
      )}
    </ul>
  )
}
