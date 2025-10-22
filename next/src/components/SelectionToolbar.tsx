'use client'

import { Archive, Ban, ArchiveRestore, MoreHorizontal, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ITEM_STATUS, ItemStatus } from '@/lib/types'
import { ItemsResponse } from '@/lib/client'
import { useState, useEffect } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ItemInlineSearch } from './ItemInlineSearch'

interface SelectionToolbarProps {
  selectedItems: ItemsResponse['items'][number][]
  onBatchStatusChange: (status: ItemStatus) => Promise<void>
  onClearSelection: () => void
  isUpdating: boolean
  changingToStatus?: ItemStatus | null
  // Search props
  searchValue: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearchClick: () => void
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  searchAddMode: boolean
  onSearchNewItem: (itemId: string, itemType: string) => void
}

interface StatusAction {
  status: ItemStatus
  label: string
  icon: typeof Archive
}

const statusActions: Record<ItemStatus, StatusAction> = {
  [ITEM_STATUS.AVAILABLE]: {
    status: ITEM_STATUS.AVAILABLE,
    label: 'Make Available',
    icon: ArchiveRestore,
  },
  [ITEM_STATUS.WITHHELD]: {
    status: ITEM_STATUS.WITHHELD,
    label: 'Withhold',
    icon: Ban,
  },
  [ITEM_STATUS.RETIRED]: {
    status: ITEM_STATUS.RETIRED,
    label: 'Retire',
    icon: Archive,
  },
}

/**
 * Gets all available actions for the selected items.
 * All actions are now moved to the overflow menu.
 */
function getAllActionsForSelection(selectedItems: ItemsResponse['items'][number][]) {
  const statuses = selectedItems.map(item => item.status)
  const uniqueStatuses = [...new Set(statuses)]
  
  // If all items have the same status, show the two possible transitions
  if (uniqueStatuses.length === 1) {
    const currentStatus = uniqueStatuses[0] as ItemStatus
    
    switch (currentStatus) {
      case ITEM_STATUS.AVAILABLE:
        return [statusActions[ITEM_STATUS.WITHHELD], statusActions[ITEM_STATUS.RETIRED]]
      case ITEM_STATUS.WITHHELD:
        return [statusActions[ITEM_STATUS.AVAILABLE], statusActions[ITEM_STATUS.RETIRED]]
      case ITEM_STATUS.RETIRED:
        return [statusActions[ITEM_STATUS.AVAILABLE], statusActions[ITEM_STATUS.WITHHELD]]
    }
  }
  
  // Mixed statuses: show all possible actions
  return [statusActions[ITEM_STATUS.AVAILABLE], statusActions[ITEM_STATUS.WITHHELD], statusActions[ITEM_STATUS.RETIRED]]
}

export function SelectionToolbar({ 
  selectedItems, 
  onBatchStatusChange, 
  onClearSelection, 
  isUpdating,
  changingToStatus,
  searchValue,
  onSearchChange,
  onSearchClick,
  onSearchKeyDown,
  searchAddMode,
  onSearchNewItem
}: SelectionToolbarProps) {
  const allActions = getAllActionsForSelection(selectedItems)
  const selectedCount = selectedItems.length
  const [popoverOpen, setPopoverOpen] = useState(false)

  const handleClearSelection = () => {
    onClearSelection()
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md sm:max-w-lg px-4 sm:px-0">
      <div className="bg-background/80 backdrop-blur-sm border-2 rounded-lg shadow-lg p-2 flex items-center gap-2 w-full">
        {/* Search input - takes full width on mobile, constrained on larger screens */}
        <div className="flex-1 min-w-0 ml-1">
          <ItemInlineSearch
            value={searchValue}
            onChange={onSearchChange}
            onClick={onSearchClick}
            onKeyDown={onSearchKeyDown}
            addMode={searchAddMode}
            onNewItem={onSearchNewItem}
          />
        </div>
        
        {/* Actions overflow menu - only show when items are selected */}
        {selectedCount > 0 && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-8 w-8 p-0 flex-shrink-0" 
                disabled={isUpdating}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                {allActions.map(({ status, label, icon: Icon }) => {
                  const isThisActionLoading = isUpdating && changingToStatus === status
                  return (
                    <div
                      key={status}
                      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
                        isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
                      }`}
                      onClick={isUpdating ? undefined : () => {
                        setPopoverOpen(false)
                        onBatchStatusChange(status)
                      }}
                    >
                      {isThisActionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="mr-2 h-4 w-4" />
                      )}
                      <span>{label}</span>
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

                
        {/* Show X icon when items are selected */}
        {selectedCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearSelection}
            disabled={isUpdating}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
