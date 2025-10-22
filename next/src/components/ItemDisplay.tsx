'use client'

import { Layers, Shirt, Footprints, Crown } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'
import { DateTime } from "luxon"
import { ItemsResponse } from '@/lib/client'
import { cn } from '@/lib/utils'
import { ITEM_STATUS, ITEM_STATUS_LABELS } from '@/lib/types'
import { itemTypeIcons } from './SelectableItem'

type ItemType = keyof typeof itemTypeIcons

interface ItemDisplayProps {
  item: ItemsResponse['items'][number]
  itemType?: string
  isCoreItem?: boolean
  showLastWornAt?: boolean
  freshness?: number
  className?: string
}

/**
 * Pure display component for items in read-only contexts.
 * No selection, no actions, just clean item display.
 */
export function ItemDisplay({ 
  item, 
  itemType, 
  isCoreItem = false, 
  showLastWornAt = false, 
  freshness,
  className
}: ItemDisplayProps) {
  const Icon = itemTypeIcons[itemType as ItemType] || Layers
  const freshnessDisplay = freshness !== undefined ? `${Math.round(freshness * 100)}%` : null
  
  return (
    <div className={cn("-mx-2", className)}>
      <div className="flex items-start space-x-3 min-w-0 max-w-full rounded-md py-1 px-2">
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
      </div>
    </div>
  )
}
