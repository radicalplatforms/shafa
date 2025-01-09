import React from 'react'
import { Button } from "@/components/ui/button"
import { Layers, Shirt, Footprints, Crown } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'

export const itemTypeIcons = {
  layer: Layers,
  top: Shirt,
  bottom: PiPantsFill,
  footwear: Footprints,
  accessory: Crown,
}

interface ItemTypeButtonsProps {
  onSelect: (type: keyof typeof itemTypeIcons) => void
  disabled: boolean
}

export function ItemTypeButtons({ onSelect, disabled }: ItemTypeButtonsProps) {
  return (
    <div className="flex space-x-2">
      {Object.entries(itemTypeIcons).map(([type, Icon]) => (
        <Button
          key={type}
          variant="outline"
          size="icon"
          disabled={disabled}
          className={`p-2 ${disabled ? 'opacity-50' : ''}`}
          onClick={() => onSelect(type as keyof typeof itemTypeIcons)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}

