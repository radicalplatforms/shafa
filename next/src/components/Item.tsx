import { Item as ItemType } from '@/types/outfit'
import { Layers, Shirt, PenIcon as Pants, FootprintsIcon as Shoe, Watch } from 'lucide-react'

interface ItemProps {
  item: ItemType
  itemType: string
}

const itemTypeIcons = {
  layer: Layers,
  top: Shirt,
  bottom: Pants,
  footwear: Shoe,
  accessory: Watch,
}

export function Item({ item, itemType }: ItemProps) {
  const IconComponent = itemTypeIcons[itemType as keyof typeof itemTypeIcons] || Watch

  return (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <IconComponent className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center space-x-2">
          {item.photoUrl && (
            <img 
              src={item.photoUrl} 
              alt={item.name} 
              className="w-10 h-10 object-cover rounded-full"
            />
          )}
          <div className="truncate">
            <p className="font-medium truncate">{item.name}</p>
            <p className="text-sm text-muted-foreground truncate">{item.brand || 'No brand'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

