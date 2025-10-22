'use client'

import React from 'react'
import { SelectableItem } from './SelectableItem'
import { SelectionToolbar } from './SelectionToolbar'
import { useItemSelection } from '@/lib/hooks/useItemSelection'
import { ItemsResponse } from '@/lib/client'

interface SelectableItemListProps {
  items: (ItemsResponse['items'][number] & { 
    itemType?: string
    freshness?: number 
  })[]
  coreItems?: string[]
  showLastWornAt?: boolean
  className?: string
  enableSelection?: boolean
  showToolbar?: boolean
  // Item action handlers
  onItemView?: (item: ItemsResponse['items'][number]) => void
  onItemEdit?: (item: ItemsResponse['items'][number]) => void
  onItemDelete?: (item: ItemsResponse['items'][number]) => void
  // Custom render function for special cases
  renderItem?: (item: ItemsResponse['items'][number] & { itemType?: string; freshness?: number }, index: number) => React.ReactNode
}

/**
 * High-level component that abstracts all selection logic and provides a clean interface
 * for displaying lists of items with optional multi-selection capabilities.
 */
export function SelectableItemList({ 
  items, 
  coreItems = [], 
  showLastWornAt = false,
  className = "space-y-1",
  enableSelection = false,
  showToolbar = true,
  onItemView,
  onItemEdit,
  onItemDelete,
  renderItem
}: SelectableItemListProps) {
  const {
    selectedItemIds,
    isBatchUpdating,
    statusChangingItemId,
    changingToStatus,
    handleToggleSelection,
    handleClearSelection,
    handleBatchStatusChange,
    handleStatusChange,
  } = useItemSelection()

  const selectedItems = items.filter(item => selectedItemIds.has(item.id))

  const defaultRenderItem = (item: ItemsResponse['items'][number] & { itemType?: string; freshness?: number }, index: number) => (
    <li key={item.id || `item-${index}`} className="text-sm m-0">
      <SelectableItem 
        item={item}
        itemType={item.itemType || item.type}
        isCoreItem={coreItems.includes(item.id)}
        showLastWornAt={showLastWornAt}
        freshness={item.freshness}
        // Selection props
        enableSelection={enableSelection}
        isSelected={selectedItemIds.has(item.id)}
        hasAnySelection={selectedItemIds.size > 0}
        onToggleSelection={handleToggleSelection}
        // Status change props
        isStatusChanging={statusChangingItemId === item.id}
        changingToStatus={changingToStatus || undefined}
        onStatusChange={handleStatusChange}
        // Action handlers
        onView={onItemView}
        onEdit={onItemEdit}
        onDelete={onItemDelete}
      />
    </li>
  )

  return (
    <>
      <ul className={className}>
        {items.map((item, index) => 
          renderItem ? renderItem(item, index) : defaultRenderItem(item, index)
        )}
      </ul>
      
      {/* Selection toolbar */}
      {enableSelection && showToolbar && selectedItems.length > 0 && (
        <SelectionToolbar
          selectedItems={selectedItems}
          onBatchStatusChange={handleBatchStatusChange}
          onClearSelection={handleClearSelection}
          isUpdating={isBatchUpdating}
          changingToStatus={changingToStatus}
        />
      )}
    </>
  )
}
