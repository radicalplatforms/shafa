import React from 'react'
import { Item } from '@/components/Item'
import { ItemToOutfit } from '@/types/outfit'
import { itemTypeIcons } from './Item'

interface ItemListProps {
  items: ItemToOutfit[]
  coreItems?: string[]
}

export function ItemList({ items, coreItems = [] }: ItemListProps) {
  return (
    <ul className="space-y-3">
      {items.map((itemToOutfit, index) => (
        <li 
          key={itemToOutfit.id || `item-${index}-${itemToOutfit.itemType}`}
        >
          <Item 
            item={itemToOutfit.item} 
            itemType={itemToOutfit.itemType as keyof typeof itemTypeIcons}
            isCoreItem={coreItems.includes(itemToOutfit.item?.id)}
          />
        </li>
      ))}
    </ul>
  )
}

