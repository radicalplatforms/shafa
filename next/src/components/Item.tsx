import { Layers, Shirt, Footprints, Crown } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'
import { DateTime } from "luxon"
import { ItemsResponse } from '@/lib/client'
import { cn } from '@/lib/utils'

export const itemTypeIcons = {
  layer: Layers,
  top: Shirt, 
  bottom: PiPantsFill,
  footwear: Footprints,
  accessory: Crown,
} as const

interface ItemProps {
  item: ItemsResponse['items'][number]
  itemType: keyof typeof itemTypeIcons
  isCoreItem?: boolean
  showLastWornAt?: boolean
  freshness?: number
}

export function Item({ item, itemType, isCoreItem = false, showLastWornAt = false, freshness }: ItemProps) {
  const Icon = itemTypeIcons[itemType]

  // Format freshness score as percentage
  const freshnessDisplay = freshness !== undefined ? `${Math.round(freshness * 100)}%` : null

  return (
    <div className="flex items-start space-x-3 min-w-0 max-w-full">
      <div className={cn("flex-shrink-0 p-[4px] rounded mt-0.5 border-2", 
        item.isArchived 
          ? "text-muted-foreground bg-background border-muted-foreground" 
          : "text-background bg-muted-foreground border-muted-foreground")}>
        <Icon className="h-[17.5px] w-[17.5px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col justify-start">
          <p className="font-medium leading-[18px]">
            {item.name}
            {isCoreItem && <span className="ml-1 text-xs align-top">•</span>}
          </p>
          <p className="text-xs text-muted-foreground -mt-[0.05rem]">
            {item.isArchived ? <i>Archived</i> : item.brand || <i>Unbranded</i>}
            {showLastWornAt && (
              <span>
                <span className="text-xs align-top ml-[5px] mr-[6px]">•</span>
                {item.lastWornAt ? (
                  <>
                    Worn {DateTime.fromISO(item.lastWornAt).toRelativeCalendar({
                      locale: 'en-US',
                      unit: 'days'
                    })} 
                  </>
                ) : (
                  <i>Never worn!</i>
                )}
              </span>
            )}
            {freshnessDisplay && (
              <span>
                <span className="text-xs align-top ml-[5px] mr-[6px]">•</span>
                F: {freshnessDisplay}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

