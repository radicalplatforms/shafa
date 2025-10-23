'use client'

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Trash2, Loader2 } from 'lucide-react'
import { ItemList } from '@/components/ItemList'
import OutfitListLoading from './OutfitListLoading'
import { FilterTag } from "@/components/ui/tag"
import Rating from '@/components/ui/rating'
import { useOutfits, useItems, useTags } from '@/lib/client'
import type { ItemStatus } from '@/lib/types'
import { useOutfitSearch } from '@/lib/hooks/useOutfitSearch'
import { SearchToolbar } from '@/components/SearchToolbar'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

export default function OutfitList() {
  const { outfits, isLoading: isLoadingOutfits, isLoadingMore, isError: isErrorOutfits, isReachingEnd, loadMore, deleteOutfit } = useOutfits()
  const { items, updateItemStatus, mutate: mutateItems } = useItems()
  const { tags } = useTags()
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
    allTags: tags
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // Create new date using UTC components to preserve the date
    const utcDate = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
    const dayOfWeek = utcDate.toLocaleDateString('en-US', { weekday: 'short' })
    const formattedDate = utcDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${dayOfWeek}, ${formattedDate}`
  }

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
          <ContextMenu>
            <ContextMenuTrigger>
              <Card className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 h-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-3 sm:mb-4 text-[12px] text-muted-foreground">
                    <span className="flex items-center">
                      <div className="flex gap-2 mr-3">
                        {Array.isArray(outfit.outfitTags) && outfit.outfitTags.length > 0 ? (
                          outfit.outfitTags.map((tagToOutfit) => {
                            const tag = tags?.find(t => t.id === tagToOutfit.tagId)
                            return tag ? (
                              <FilterTag
                                key={tag.id}
                                name={tag.name}
                                hexColor={tag.hexColor}
                                selected={true}
                              />
                            ) : null
                          })
                        ) : (<FilterTag
                          key="na-tag"
                              name="N/A"
                              hexColor="#6b7280"
                              selected={true}
                            />
                          )}
                      </div>
                      <Rating rating={typeof outfit.rating === 'number' ? (outfit.rating as 0 | 1 | 2) : 0} />
                      {outfit.locationLatitude && outfit.locationLongitude ? (
                        <MapPin className="ml-3 h-3 w-3 sm:h-4 sm:w-4" />
                      ) : null}
                    </span>
                    {outfit.wearDate && formatDate(outfit.wearDate)}
                  </div>
                  <ItemList 
                    outfitItems={outfit.outfitItems} 
                    showThreeDotsMenu={true}
                    onItemStatusChange={handleItemStatusChange}
                    statusChangingItemId={statusChangingItemId}
                    changingToStatus={changingToStatus}
                  />
                </CardContent>
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem 
                className={`text-destructive focus:text-destructive ${deletingOutfitId === outfit.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={deletingOutfitId === outfit.id ? undefined : () => handleDelete(outfit.id)}
                disabled={deletingOutfitId === outfit.id}
              >
                {deletingOutfitId === outfit.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Outfit
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
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
