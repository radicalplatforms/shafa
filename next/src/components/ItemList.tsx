import React from 'react'
import { Item, itemTypeIcons } from '@/components/Item'
import { OutfitsResponse, useItems } from '@/lib/client'
import { ItemListLoading } from './ItemListLoading'

interface ItemListProps {
  itemsToOutfits: OutfitsResponse['outfits'][number]['itemsToOutfits']
  coreItems?: string[]
}

export function ItemList({ itemsToOutfits, coreItems = [] }: ItemListProps) {
  const { items, isLoading: isLoadingItems } = useItems()

  if (isLoadingItems) {
    return <ItemListLoading />
  }

  return (
    <ul className="space-y-2">
      {itemsToOutfits.map((itemToOutfit, index) => {
        if (!itemToOutfit.itemId || !itemToOutfit.itemType) return null
        
        const item = items.find(item => item.id === itemToOutfit.itemId)
        if (!item) return null

        return (
          <li key={itemToOutfit.itemId || `item-${index}-${itemToOutfit.itemType}`} className="text-sm">
            <Item 
              item={item}
              itemType={itemToOutfit.itemType as keyof typeof itemTypeIcons}
              isCoreItem={coreItems.includes(item.id)}
            />
          </li>
        )
      })}
    </ul>
  )
}
