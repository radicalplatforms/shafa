'use client'

import { Layers, Shirt, Footprints, Crown, Circle } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'
import { DateTime } from "luxon"
import { ItemsResponse } from '@/lib/client'
import { cn } from '@/lib/utils'
import { ITEM_STATUS, ITEM_STATUS_LABELS, ItemStatus } from '@/lib/types'
import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ItemActions } from './ItemActions'

export const itemTypeIcons = {
  layer: Layers,
  top: Shirt, 
  bottom: PiPantsFill,
  footwear: Footprints,
  accessory: Crown,
} as const

type ItemType = keyof typeof itemTypeIcons

interface SelectableItemProps {
  item: ItemsResponse['items'][number]
  itemType?: string
  isCoreItem?: boolean
  showLastWornAt?: boolean
  freshness?: number
  // Selection props
  enableSelection?: boolean
  isSelected?: boolean
  hasAnySelection?: boolean
  onToggleSelection?: (itemId: string) => void
  // Status change props
  isStatusChanging?: boolean
  changingToStatus?: ItemStatus
  onStatusChange?: (itemId: string, status: ItemStatus) => Promise<void>
  // Action handlers
  onView?: (item: ItemsResponse['items'][number]) => void
  onEdit?: (item: ItemsResponse['items'][number]) => void
  onDelete?: (item: ItemsResponse['items'][number]) => void
  // Display options
  showThreeDotsMenu?: boolean
  className?: string
}

/**
 * Core item component with built-in selection support and clean action handling.
 * Replaces the complex Item component with a cleaner, more focused implementation.
 */
export function SelectableItem({ 
  item, 
  itemType, 
  isCoreItem = false, 
  showLastWornAt = false, 
  freshness,
  enableSelection = false,
  isSelected = false,
  hasAnySelection = false,
  onToggleSelection,
  isStatusChanging = false,
  changingToStatus,
  onStatusChange,
  onView,
  onEdit,
  onDelete,
  showThreeDotsMenu = false,
  className
}: SelectableItemProps) {
  const Icon = itemTypeIcons[itemType as ItemType] || Layers
  const freshnessDisplay = freshness !== undefined ? `${Math.round(freshness * 100)}%` : null
  const [isHovered, setIsHovered] = useState(false)
  const [isSwiping, setIsSwiping] = useState(false)
  
  // Show selection circle when: hovering (desktop) OR this item is selected OR any item is selected
  const showSelectionCircle = enableSelection && (isHovered || isSelected || hasAnySelection)
  
  // Swipe detection for mobile
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchStartTime = useRef<number>(0)
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSelection) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
  }, [enableSelection])
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableSelection || !onToggleSelection || e.changedTouches.length === 0) return
    
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const touchEndTime = Date.now()
    
    const deltaX = touchStartX.current - touchEndX
    const deltaY = Math.abs(touchStartY.current - touchEndY)
    const deltaTime = touchEndTime - touchStartTime.current
    
    // Swipe left detection: minimum 50px horizontal, max 100px vertical, within 500ms
    if (deltaX > 50 && deltaY < 100 && deltaTime < 500) {
      e.preventDefault()
      setIsSwiping(true)
      onToggleSelection(item.id)
      
      // Reset swipe animation after completion
      setTimeout(() => {
        setIsSwiping(false)
      }, 300)
    }
  }, [enableSelection, onToggleSelection, item.id])
  
  const handleSelectionClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleSelection) {
      onToggleSelection(item.id)
    }
  }, [onToggleSelection, item.id])
  
  const handleItemClick = useCallback((e: React.MouseEvent) => {
    // Only toggle selection if any items are already selected
    if (hasAnySelection && onToggleSelection) {
      e.stopPropagation()
      onToggleSelection(item.id)
    }
  }, [hasAnySelection, onToggleSelection, item.id])
  
  const itemContent = (
    <div 
      className={cn(
        "flex items-start space-x-3 min-w-0 max-w-full rounded-md py-1 px-2 transition-all duration-50",
        (isHovered || isSelected) && !className?.includes("hover:bg-transparent") && "bg-muted/30",
        isStatusChanging && "opacity-50",
        hasAnySelection && "cursor-pointer",
        isSwiping && "transform -translate-x-2",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleItemClick}
    >
      <div className={cn("flex-shrink-0 p-[4px] rounded mt-0.5 border-2", 
        item.status !== ITEM_STATUS.AVAILABLE 
          ? "text-muted-foreground bg-background border-muted-foreground" 
          : "text-background bg-muted-foreground border-muted-foreground")}>
        <Icon className="h-[17.5px] w-[17.5px]" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-col justify-start">
          <p className="font-medium leading-[16.5px]">
            {item.name}
            {isCoreItem && <span className="ml-1 text-xs align-top">•</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-[0.05rem]">
            {item.status !== ITEM_STATUS.AVAILABLE && (
              <>
                <i>{ITEM_STATUS_LABELS[item.status as keyof typeof ITEM_STATUS_LABELS]}</i>
                <span className="text-xs align-top ml-1 mr-1.5">•</span>
              </>
            )}
            <span>
              {item.brand ? item.brand : <i>Unbranded</i>}
            </span>
            {showLastWornAt && (
              <>
                <span className="text-xs align-top ml-1 mr-1.5">•</span>
                {item.lastWornAt ? (
                  <>Worn {DateTime.fromISO(item.lastWornAt).toRelativeCalendar({ locale: "en-US", unit: "days" })}</>
                ) : (
                  <i>Never worn!</i>
                )}
              </>
            )}
            {freshnessDisplay && (
              <>
                <span className="text-xs align-top ml-1 mr-1.5">•</span>
                F: {freshnessDisplay}
              </>
            )}
          </p>
        </div>
      </div>
      
      {/* Three dots menu */}
      {showThreeDotsMenu && (
        <div className="flex-shrink-0 flex items-center">
          <ItemActions
            item={item}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            isStatusChanging={isStatusChanging}
            changingToStatus={changingToStatus}
            showThreeDotsButton
            disabled={isStatusChanging}
          />
        </div>
      )}
      
      {/* Selection circle */}
      {showSelectionCircle && (
        <div className="flex-shrink-0 flex items-center animate-in fade-in-0 duration-200">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-transparent"
            onClick={handleSelectionClick}
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <Circle
                className={cn(
                  "h-5 w-5 transition-colors duration-200 ease-in-out",
                  isSelected
                    ? "text-primary"
                    : "text-muted-foreground/60 hover:text-muted-foreground/80"
                )}
              />
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="animate-in fade-in-0 duration-200 h-[8px] w-[8px] rounded-full bg-primary" />
                </span>
              )}
            </span>
          </Button>
        </div>
      )}
    </div>
  )

  // If we have actions and not showing three dots, wrap with context menu
  const hasActions = onView || onEdit || onDelete || onStatusChange
  if (hasActions && !showThreeDotsMenu) {
    return (
      <ItemActions
        item={item}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        isStatusChanging={isStatusChanging}
        changingToStatus={changingToStatus}
      >
        <div className="-mx-2">
          {itemContent}
        </div>
      </ItemActions>
    )
  }

  return <div className="-mx-2">{itemContent}</div>
}
