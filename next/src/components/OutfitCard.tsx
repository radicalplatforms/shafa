'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ItemList } from '@/components/ItemList'
import { useTags } from '@/lib/client'
import { FilterTag } from '@/components/ui/tag'
import Rating from '@/components/ui/rating'
import { MapPin, Trash2, Loader2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

type OutfitCardProps = {
  outfitItems: Array<{
    itemId: string
    itemType: string
  }>
  tags?: Array<{
    tagId: string
  }>
  wearDate?: string | null
  rating?: number
  locationLatitude?: number | null
  locationLongitude?: number | null
  index?: number
  showThreeDotsMenu?: boolean
  // Context menu props
  onDelete?: () => void
  deletingOutfitId?: string | null
  // Item status change props
  onItemStatusChange?: (itemId: string, status: 'available' | 'withheld' | 'retired') => Promise<void>
  statusChangingItemId?: string | null
  changingToStatus?: 'available' | 'withheld' | 'retired' | null
}

export default function OutfitCard({
  outfitItems,
  tags: outfitTags,
  wearDate,
  rating,
  locationLatitude,
  locationLongitude,
  index = 0,
  showThreeDotsMenu = false,
  onDelete,
  deletingOutfitId,
  onItemStatusChange,
  statusChangingItemId,
  changingToStatus
}: OutfitCardProps) {
  const { tags } = useTags()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const cardContent = (
    <Card className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 h-full">
      <CardContent className="p-3 sm:p-4">
        <div className="flex justify-between items-center mb-3 sm:mb-4 text-[12px] text-muted-foreground">
          <span className="flex items-center">
            <div className="flex gap-2 mr-3">
              {Array.isArray(outfitTags) && outfitTags.length > 0 ? (
                outfitTags.map((tagToOutfit) => {
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
              ) : (
                <FilterTag
                  key="na-tag"
                  name="N/A"
                  hexColor="#6b7280"
                  selected={true}
                />
              )}
            </div>
            <Rating rating={typeof rating === 'number' ? (rating as 0 | 1 | 2) : 0} />
            {locationLatitude && locationLongitude ? (
              <MapPin className="ml-3 h-3 w-3 sm:h-4 sm:w-4" />
            ) : null}
          </span>
          {wearDate && (
            <span className="text-xs">
              {formatDate(wearDate)}
            </span>
          )}
        </div>
        <ItemList
          outfitItems={outfitItems}
          showThreeDotsMenu={showThreeDotsMenu}
          onItemStatusChange={onItemStatusChange}
          statusChangingItemId={statusChangingItemId}
          changingToStatus={changingToStatus}
        />
      </CardContent>
    </Card>
  )

  return (
    <div
      className={`h-full animate-in fade-in slide-in-from-bottom-4 duration-700`}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {onDelete ? (
        <ContextMenu>
          <ContextMenuTrigger>
            {cardContent}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem 
              className={`text-destructive focus:text-destructive ${deletingOutfitId ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={deletingOutfitId ? undefined : () => onDelete?.()}
              disabled={!!deletingOutfitId}
            >
              {deletingOutfitId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete outfit
                </>
              )}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        cardContent
      )}
    </div>
  )
}
