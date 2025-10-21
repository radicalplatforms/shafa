'use client'

import { useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin, Trash2 } from 'lucide-react'
import { ItemList } from '@/components/ItemList'
import OutfitListLoading from './OutfitListLoading'
import Rating from '@/components/ui/rating'
import { Tag } from "@/components/ui/tag"
import { useOutfits, useItems, useTags } from '@/lib/client'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

export default function OutfitList() {
  const { outfits, isLoading: isLoadingOutfits, isLoadingMore, isError: isErrorOutfits, isReachingEnd, loadMore, deleteOutfit } = useOutfits()
  const { items, isLoading: isLoadingItems, isError: isErrorItems } = useItems()
  const { tags, isLoading: isLoadingTags, isError: isErrorTags } = useTags()
  const observer = useRef<IntersectionObserver | null>(null)

  const lastOutfitElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingOutfits || isLoadingItems || isLoadingTags || isLoadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isReachingEnd) {
        loadMore()
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoadingOutfits, isLoadingItems, isLoadingTags, isLoadingMore, isReachingEnd, loadMore])

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
    try {
      await deleteOutfit(outfitId)
    } catch (error) {
      console.error('Error deleting outfit:', error)
    }
  }

  if (isLoadingOutfits) {
    return <OutfitListLoading />
  }

  if (isErrorOutfits) {
    return <div className="text-destructive">{isErrorOutfits.toString()}</div>
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {outfits.map((outfit, index) => (
        <div
          key={`outfit-${outfit.id}`}
          ref={index === outfits.length - 1 ? lastOutfitElementRef : null}
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
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <span className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      {outfit.wearDate ? formatDate(outfit.wearDate) : 'Never'}
                      {outfit.locationLatitude && outfit.locationLongitude && (
                        <MapPin className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      <div className="flex gap-2 ml-3">
                        {outfit.tagsToOutfits.map((tagToOutfit) => {
                          const tag = tags?.find(t => t.id === tagToOutfit.tagId)
                          if (!tag) return null
                          return (
                            <Tag
                              key={tag.id}
                              name={tag.name}
                              hexColor={tag.hexColor}
                              selected={true}
                            />
                          )
                        })}
                      </div>
                    </span>
                    <Rating rating={outfit.rating as 0 | 1 | 2} />
                  </div>
                  <ItemList itemsToOutfits={outfit.itemsToOutfits} />
                </CardContent>
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(outfit.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Outfit
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      ))}
    </div>
  )
}
