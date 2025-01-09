import { Item as ItemType } from '@/types/outfit'
import { Layers, Shirt, Footprints, Crown } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'

export const itemTypeIcons = {
  layer: Layers,
  top: Shirt,
  bottom: PiPantsFill,
  footwear: Footprints,
  accessory: Crown,
} as const

interface ItemProps {
  item: ItemType
  itemType: keyof typeof itemTypeIcons
  isCoreItem?: boolean
}

export function Item({ item, itemType, isCoreItem = false }: ItemProps) {
  const Icon = itemTypeIcons[itemType]


  return (
    <div className="flex items-start space-x-3 min-w-0 max-w-full">
      <div className="flex-shrink-0 p-1 rounded bg-gray-700 text-white mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col justify-start">
          <p className="font-medium">
            {item.name}
            {isCoreItem && <span className="ml-1 text-xs align-top">•</span>}
          </p>
          <p className="text-xs text-muted-foreground -mt-[0.1rem]">
            {item.brand || <i>Unbranded</i>}
          </p>
        </div>
      </div>
    </div>
  )
}

