import React, { useState } from 'react'
import { Item, itemTypeIcons } from '@/components/Item'
import { OutfitsResponse, OutfitSuggestionsResponse, useItems } from '@/lib/client'
import { ItemListLoading } from './ItemListLoading'

interface ItemListProps {
  itemsToOutfits: OutfitsResponse['outfits'][number]['itemsToOutfits'] | OutfitSuggestionsResponse['suggestions'][number]['itemsToOutfits']
  coreItems?: string[]
  showLastWornAt?: boolean
  isInteractive?: boolean
}

export function ItemList({ 
  itemsToOutfits, 
  coreItems = [], 
  showLastWornAt = false,
  isInteractive = false
}: ItemListProps) {
  const { items, isLoading: isLoadingItems, archiveItem, updateItem, mutate } = useItems()
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  const handleItemSelect = (itemId: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      // If multi-select (Cmd/Ctrl key pressed), toggle this item in the selection
      setSelectedItems(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId) // Remove if already selected
          : [...prev, itemId] // Add if not selected
      );
    } else {
      // Single select - either select just this item or deselect if already the only selection
      setSelectedItems(prev => 
        (prev.length === 1 && prev[0] === itemId) 
          ? [] // Deselect if this was the only selected item
          : [itemId] // Otherwise select only this item
      );
    }
  };

  if (isLoadingItems) {
    return <ItemListLoading />
  }

  return (
    <ul className="space-y-2">
      {itemsToOutfits.map((itemToOutfit, index) => {
        if (!itemToOutfit.itemId || !itemToOutfit.itemType) return null
        
        const item = items.find(item => item.id === itemToOutfit.itemId)
        if (!item) return null

        const isSelected = selectedItems.includes(item.id);

        return (
          <li key={itemToOutfit.itemId || `item-${index}-${itemToOutfit.itemType}`} className="text-sm">
            <Item 
              item={item}
              itemType={itemToOutfit.itemType as keyof typeof itemTypeIcons}
              isCoreItem={coreItems.includes(item.id)}
              showLastWornAt={showLastWornAt}
              freshness={'freshness' in itemToOutfit ? itemToOutfit.freshness : undefined}
              isInteractive={isInteractive}
              onItemUpdate={updateItem}
              onArchiveToggle={archiveItem}
              isSelected={isSelected}
              onSelect={handleItemSelect}
            />
          </li>
        )
      })}
    </ul>
  )
}
