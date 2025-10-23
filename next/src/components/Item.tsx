'use client'

import { Layers, Shirt, Footprints, Crown } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'
import { DateTime } from "luxon"
import { ItemsResponse } from '@/lib/client'
import { cn } from '@/lib/utils'
import { ITEM_STATUS, ITEM_STATUS_LABELS, ItemStatus } from '@/lib/types'
import { useState } from 'react'
import { ItemActions } from './ItemActions'
import { CountTag } from '@/components/ui/tag'

export const itemTypeIcons = {
  layer: Layers,
  top: Shirt, 
  bottom: PiPantsFill,
  footwear: Footprints,
  accessory: Crown,
} as const

type ItemType = keyof typeof itemTypeIcons

interface ItemProps {
  item: ItemsResponse['items'][number]
  itemType?: string
  isCoreItem?: boolean
  showLastWornAt?: boolean
  freshness?: number
  showAggregatedTags?: boolean // Only show on items page
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
 * Core item component with clean action handling.
 * Displays item information with optional 3-dots menu for actions.
 */
export function Item({ 
  item, 
  itemType, 
  isCoreItem = false, 
  showLastWornAt = false, 
  freshness,
  showAggregatedTags = false,
  isStatusChanging = false,
  changingToStatus,
  onStatusChange,
  onView,
  onEdit,
  onDelete,
  showThreeDotsMenu = false,
  className
}: ItemProps) {
  const Icon = itemTypeIcons[itemType as ItemType] || Layers
  const freshnessDisplay = freshness !== undefined ? `${Math.round(freshness * 100)}%` : null
  const [isHovered, setIsHovered] = useState(false)
  
  const itemContent = (
    <div 
      className={cn(
        "flex items-start space-x-3 min-w-0 max-w-full rounded-md py-1 px-2 transition-all duration-50",
        isHovered && !className?.includes("hover:bg-transparent") && "bg-muted/30",
        isStatusChanging && "opacity-50",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          
          {/* Aggregated tags below item info on mobile */}
          {showAggregatedTags && item.aggregatedTags && item.aggregatedTags.length > 0 && (
            <div className="flex sm:hidden flex-wrap gap-1 mt-1">
              {item.aggregatedTags
                .sort((a, b) => b.count - a.count) // Sort by count descending (highest first)
                .slice(0, 2) // Show up to 2 tags
                .map((tag) => (
                  <CountTag
                    key={tag.tagId}
                    name={tag.tagName}
                    hexColor={tag.hexColor}
                    count={tag.count}
                  />
                ))}
              {item.aggregatedTags.length > 2 && (
                <span className="text-xs text-muted-foreground px-1 flex items-center">
                  +{item.aggregatedTags.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Right side: tags and three dots menu */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {/* Aggregated tags on larger screens */}
        {showAggregatedTags && item.aggregatedTags && item.aggregatedTags.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1">
            {item.aggregatedTags
              .sort((a, b) => b.count - a.count) // Sort by count descending (highest first)
              .slice(0, 3) // Show up to 3 tags
              .map((tag) => (
                <CountTag
                  key={tag.tagId}
                  name={tag.tagName}
                  hexColor={tag.hexColor}
                  count={tag.count}
                />
              ))}
            {item.aggregatedTags.length > 3 && (
              <span className="text-xs text-muted-foreground px-1 flex items-center">
                +{item.aggregatedTags.length - 3} more
              </span>
            )}
          </div>
        )}
        
        {/* Three dots menu */}
        {showThreeDotsMenu && (
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
        )}
      </div>
    </div>
  )

  // Always wrap with context menu when we have actions
  const hasActions = onView || onEdit || onDelete || onStatusChange
  if (hasActions) {
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
