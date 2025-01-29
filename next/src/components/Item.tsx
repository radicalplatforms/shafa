import { Layers, Shirt, Footprints, Crown } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'
import { DateTime } from "luxon"
import { ItemsResponse } from '@/lib/client'
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
}

export function Item({ item, itemType, isCoreItem = false, showLastWornAt = false }: ItemProps) {
  const Icon = itemTypeIcons[itemType]

  return (
    <div className="flex items-start space-x-3 min-w-0 max-w-full">
      <div className="flex-shrink-0 p-[5px] rounded bg-gray-700 text-white mt-0.5">
        <Icon className="h-[17.5px] w-[17.5px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col justify-start">
          <p className="font-medium leading-[18px]">
            {item.name}
            {isCoreItem && <span className="ml-1 text-xs align-top">•</span>}
          </p>
          <p className="text-xs text-muted-foreground -mt-[0.05rem]">
            {item.brand || <i>Unbranded</i>}
            {showLastWornAt && item.lastWornAt && (
              <span>
                <span className="text-xs align-top ml-[5px] mr-[6px]">•</span>
                Worn {DateTime.fromISO(item.lastWornAt).toRelativeCalendar({
                  locale: 'en-US',
                  unit: 'days'
                })}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

