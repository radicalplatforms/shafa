'use client'

import { useCallback, useRef, useState } from 'react'
import OutfitCard from './OutfitCard'
import OutfitListLoading from './OutfitListLoading'
import { useOutfits, useItems } from '@/lib/client'
import type { ItemStatus } from '@/lib/types'
import { useOutfitSearch } from '@/lib/hooks/useOutfitSearch'
import { SearchToolbar } from '@/components/SearchToolbar'

export default function OutfitList() {
  const { outfits, isLoading: isLoadingOutfits, isLoadingMore, isError: isErrorOutfits, isReachingEnd, loadMore, deleteOutfit } = useOutfits()
  const { items, updateItemStatus, mutate: mutateItems } = useItems()
  const observer = useRef<IntersectionObserver | null>(null)
  const [deletingOutfitId, setDeletingOutfitId] = useState<string | null>(null)
  const [statusChangingItemId, setStatusChangingItemId] = useState<string | null>(null)
  const [changingToStatus, setChangingToStatus] = useState<ItemStatus | null>(null)

  const {
    searchTerm,
    addMode,
    filteredOutfits,
    handleSearchChange,
    handleKeyDown,
    handleNewItem
  } = useOutfitSearch({
    outfits,
    allItems: items,
    allTags: []
  })

  const lastOutfitElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingOutfits || isLoadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isReachingEnd) {
        loadMore()
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoadingOutfits, isLoadingMore, isReachingEnd, loadMore])


  const handleDelete = async (outfitId: string) => {
    setDeletingOutfitId(outfitId)
    try {
      await deleteOutfit(outfitId)
    } catch (error) {
      console.error('Error deleting outfit:', error)
    } finally {
      setDeletingOutfitId(null)
    }
  }

  const handleItemStatusChange = async (itemId: string, newStatus: ItemStatus) => {
    setStatusChangingItemId(itemId)
    setChangingToStatus(newStatus)
    try {
      const success = await updateItemStatus(itemId, newStatus)
      if (success) {
        mutateItems()
      }
    } catch (error) {
      console.error('Error updating item status:', error)
    } finally {
      setStatusChangingItemId(null)
      setChangingToStatus(null)
    }
  }

  if (isLoadingOutfits) {
    return <OutfitListLoading />
  }

  if (isErrorOutfits) {
    return <div className="text-destructive">{isErrorOutfits.toString()}</div>
  }

  return (
    <div className="space-y-6">
      {!addMode && filteredOutfits.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 pb-10">
          {filteredOutfits.map((outfit, index) => (
            <div
              key={`outfit-${outfit.id}`}
              ref={index === filteredOutfits.length - 1 ? lastOutfitElementRef : null}
              className={`h-full animate-in fade-in slide-in-from-bottom-4 ${index === 9 ? "duration-1000" : "duration-700"}`}
              style={{ 
                animationDelay: `${index * 50}ms`, 
                animationFillMode: 'forwards',
                ...(index === 9 && { filter: 'blur(0) !important', opacity: '1 !important' })
              }}
            >
              <OutfitCard
                outfitItems={outfit.outfitItems}
                tags={outfit.outfitTags}
                wearDate={outfit.wearDate}
                rating={outfit.rating}
                locationLatitude={outfit.locationLatitude}
                locationLongitude={outfit.locationLongitude}
                index={index}
                showThreeDotsMenu={true}
                onDelete={() => handleDelete(outfit.id)}
                deletingOutfitId={deletingOutfitId === outfit.id ? outfit.id : null}
                onItemStatusChange={handleItemStatusChange}
                statusChangingItemId={statusChangingItemId}
                changingToStatus={changingToStatus}
              />
            </div>
          ))}
        </div>
      ) : !addMode ? (
        <div className="p-8 text-center pb-10">
          <p className="text-muted-foreground">
            {searchTerm 
              ? "No outfits found matching your search criteria. Keep typing to create a new item."
              : "No outfits found."}
          </p>
        </div>
      ) : null}
      
      <SearchToolbar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchKeyDown={handleKeyDown}
        searchAddMode={addMode}
        onSearchNewItem={handleNewItem}
      />
    </div>
  )
}
