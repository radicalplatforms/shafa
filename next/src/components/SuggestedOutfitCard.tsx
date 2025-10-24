'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FilterTag } from '@/components/ui/tag'
import { ItemList } from '@/components/ItemList'

type OutfitItem = {
  itemId: string
  itemType: 'layer' | 'top' | 'bottom' | 'footwear' | 'accessory'
}

type SuggestedOutfitCardProps = {
  items: OutfitItem[]
  tagIds?: string[]
  reasoning?: string
  index?: number
}

export default function SuggestedOutfitCard({ items, tagIds, reasoning, index = 0 }: SuggestedOutfitCardProps) {
  // Convert OutfitItem[] to the format expected by ItemList
  const outfitItems = items.map(item => ({
    itemId: item.itemId,
    itemType: item.itemType,
  }))

  return (
    <div
      className={`h-full animate-in fade-in slide-in-from-bottom-4 duration-700`}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'forwards',
      }}
    >
      <Card className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 h-full">
        <CardContent className="p-3 sm:p-4">
          {/* Header section matching OutfitList */}
          <div className="flex justify-between items-center mb-3 sm:mb-4 text-[12px] text-muted-foreground">
            <span className="flex items-center">
              <div className="flex gap-2 mr-3">
                {tagIds && tagIds.length > 0 ? (
                  tagIds.map((tagId) => (
                    <FilterTag
                      key={tagId}
                      name="Suggested"
                      hexColor="#6b7280"
                      selected={true}
                    />
                  ))
                ) : (
                  <FilterTag
                    key="suggestion-tag"
                    name="Suggestion"
                    hexColor="#6b7280"
                    selected={true}
                  />
                )}
              </div>
            </span>
            {reasoning && (
              <span className="text-xs italic truncate max-w-[200px]" title={reasoning}>
                {reasoning}
              </span>
            )}
          </div>

          {/* ItemList matching OutfitList */}
          <ItemList
            outfitItems={outfitItems}
            showThreeDotsMenu={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
