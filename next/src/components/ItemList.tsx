import React from 'react'
import { OutfitsResponse, OutfitSuggestionsResponse, useItems, ItemsResponse } from '@/lib/client'
import { ItemListLoading } from './ItemListLoading'
import { ItemDisplay } from './ItemDisplay'
import { SelectableItem } from './SelectableItem'

type ItemToOutfit = OutfitsResponse['outfits'][number]['outfitItems'][number] | OutfitSuggestionsResponse['suggestions'][number]['outfitItems'][number]

interface ItemListProps {
  outfitItems: ItemToOutfit[]
  coreItems?: string[]
  showLastWornAt?: boolean
  showThreeDotsMenu?: boolean
  onItemView?: (item: ItemsResponse['items'][number]) => void
  onItemEdit?: (item: ItemsResponse['items'][number]) => void
  onItemDelete?: (item: ItemsResponse['items'][number]) => void
  onItemStatusChange?: (itemId: string, status: any) => Promise<void>
  statusChangingItemId?: string | null
  changingToStatus?: any
}

/**
 * Simple item list for outfit contexts. Uses ItemDisplay for read-only display
 * or SelectableItem with three-dots menu when actions are needed.
 */
export function ItemList({ 
  outfitItems, 
  coreItems = [], 
  showLastWornAt = false,
  showThreeDotsMenu = false,
  onItemView,
  onItemEdit,
  onItemDelete,
  onItemStatusChange,
  statusChangingItemId,
  changingToStatus
}: ItemListProps) {
  const { items, isLoading: isLoadingItems } = useItems()

  if (isLoadingItems) {
    return <ItemListLoading />
  }

  // Transform outfitItems to items with additional data
  const transformedItems: (ItemsResponse['items'][number] & { 
    itemType: string
    freshness?: number 
  })[] = outfitItems
    .map((itemToOutfit) => {
      if (!itemToOutfit.itemId || !itemToOutfit.itemType) return null
      
      const item = items.find((item: any) => item.id === itemToOutfit.itemId)
      if (!item) return null

      return {
        ...item,
        itemType: itemToOutfit.itemType,
        freshness: 'freshness' in itemToOutfit ? itemToOutfit.freshness : undefined
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <ul className="space-y-1">
      {transformedItems.map((item, index) => (
        <li key={item.id || `item-${index}`} className="text-sm m-0">
          {showThreeDotsMenu ? (
            <SelectableItem
              item={item}
              itemType={item.itemType}
              isCoreItem={coreItems.includes(item.id)}
              showLastWornAt={showLastWornAt}
              freshness={item.freshness}
              showThreeDotsMenu={true}
              onView={onItemView}
              onEdit={onItemEdit}
              onDelete={onItemDelete}
              onStatusChange={onItemStatusChange}
              isStatusChanging={statusChangingItemId === item.id}
              changingToStatus={changingToStatus}
            />
          ) : (
            <ItemDisplay
              item={item}
              itemType={item.itemType}
              isCoreItem={coreItems.includes(item.id)}
              showLastWornAt={showLastWornAt}
              freshness={item.freshness}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
