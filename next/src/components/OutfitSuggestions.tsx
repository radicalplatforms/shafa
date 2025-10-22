'use client'

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { SuggestionScoreBar } from '@/components/SuggestionScoreBar'
import { ItemList } from '@/components/ItemList'
import OutfitSuggestionsLoading from './OutfitSuggestionsLoading'
import Rating from '@/components/ui/rating'
import { useSuggestedOutfits, useTags, useItems } from '@/lib/client'
import { Tag } from '@/components/ui/tag'
import { MapPin } from 'lucide-react'

export default function OutfitSuggestions() {
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(undefined)
  
  const { 
    suggestions, 
    isLoading, 
    isError, 
    isLoadingMore, 
    isReachingEnd, 
    loadMore 
  } = useSuggestedOutfits(selectedTagId)
  const { tags, isLoading: isLoadingTags } = useTags()
  const { updateItemStatus, mutate: mutateItems } = useItems()
  const [statusChangingItemId, setStatusChangingItemId] = useState<string | null>(null)
  const [changingToStatus, setChangingToStatus] = useState<any>(null)

  const observer = useRef<IntersectionObserver | null>(null)

  const lastSuggestionElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isLoadingTags || isLoadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isReachingEnd) {
        loadMore()
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoading, isLoadingTags, isLoadingMore, isReachingEnd, loadMore])

  const handleTagClick = (tagId: string) => {
    if (selectedTagId === tagId) {
      // If the same tag is clicked again, clear the filter
      setSelectedTagId(undefined)
    } else {
      // Otherwise set the selected tag
      setSelectedTagId(tagId)
    }
  }

  const handleItemStatusChange = async (itemId: string, newStatus: any) => {
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

  if ((isLoading || isLoadingTags) && suggestions.length === 0) {
    return <OutfitSuggestionsLoading />
  }

  if (isError) {
    return <div className="text-destructive">{isError.toString()}</div>
  }

  const maxScore = suggestions[0]?.totalScore || 0

  return (
    <div className="space-y-6">
      {/* Tags filter section */}
      <div className="flex items-center">
        <div className="flex flex-wrap gap-2 pb-1 w-full">
          {tags && tags.length > 0 ? (
            tags.map((tag) => (
              <Tag
                key={tag.id}
                name={tag.name}
                hexColor={tag.hexColor}
                selected={selectedTagId === tag.id}
                onClick={() => handleTagClick(tag.id)}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No tags available</p>
          )}
        </div>
      </div>

      {/* Suggestions grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {suggestions.map((suggestion, index) => {
          // Use longer duration for the last few items
          const isLongerDuration = index >= Math.max(0, suggestions.length - 2);
          
          return (
            <div
              key={`suggestion-${suggestion.id}`}
              ref={index === suggestions.length - 1 ? lastSuggestionElementRef : null}
              className={`h-full animate-in fade-in slide-in-from-bottom-4 ${isLongerDuration ? "duration-1000" : "duration-700"}`}
              style={{ 
                animationDelay: `${index * 50}ms`, 
                animationFillMode: 'forwards',
                ...(isLongerDuration && { filter: 'blur(0) !important', opacity: '1 !important' })
              }}
            >
              <Card className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 h-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-3 sm:mb-4 text-[12px] text-muted-foreground">
                    <span className="flex items-center">
                      <div className="flex gap-2 mr-3">
                        {Array.isArray(suggestion.outfitTags) && suggestion.outfitTags.length > 0 ? (
                          suggestion.outfitTags.map((tagToOutfit) => {
                            const tag = tags?.find(t => t.id === tagToOutfit.tagId)
                            return tag ? (
                              <Tag
                                key={tag.id}
                                name={tag.name}
                                hexColor={tag.hexColor}
                                selected={true}
                              />
                            ) : null
                          })
                        ) : (<Tag
                        key="na-tag"
                            name="N/A"
                            hexColor="#6b7280"
                            selected={true}
                          />
                        )}
                      </div>
                      <Rating rating={typeof suggestion.rating === 'number' ? (suggestion.rating as 0 | 1 | 2) : 0} />
                      {suggestion.locationLatitude && suggestion.locationLongitude ? (
                        <MapPin className="ml-3 h-3 w-3 sm:h-4 sm:w-4" />
                      ) : null}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Suggestion Score</p>
                    <SuggestionScoreBar
                      totalScore={suggestion.totalScore}
                      maxScore={maxScore}
                      categories={[
                        { name: 'Rating', score: suggestion.scoringDetails.ratingScore, color: '#2563eb' },
                        { name: 'Time', score: suggestion.scoringDetails.timeScore, color: '#15803d' },
                        { name: 'Frequency', score: suggestion.scoringDetails.frequencyScore, color: '#d97706' },
                      ]}
                    />
                  </div>
                  <div className="divider"></div>
                  <ItemList 
                    outfitItems={suggestion.outfitItems}
                    showLastWornAt={true}
                    showThreeDotsMenu={true}
                    onItemStatusChange={handleItemStatusChange}
                    statusChangingItemId={statusChangingItemId}
                    changingToStatus={changingToStatus}
                  />
                  <div className="mt-4 text-xs text-muted-foreground">
                    <p>Last Worn: {suggestion.wearDate ? `${suggestion.scoringDetails.rawData.daysSinceWorn} days ago` : 'Never'}</p>
                    <p>Wear Count: {suggestion.scoringDetails.rawData.wearCount}</p>
                    <p>Recently Worn Items: {suggestion.scoringDetails.rawData.recentlyWornItems}</p>
                    <p>Avg Item Freshness: {suggestion.scoringDetails.rawData.avgItemFreshness}</p>
                    <p>Outfit Freshness: {suggestion.scoringDetails.rawData.outfitFreshness}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
        
        {suggestions.length === 0 && !isLoading && (
          <div className="col-span-3 p-8 text-center">
            <p className="text-muted-foreground">
              {selectedTagId 
                ? "No suggestions found with the selected tag. Try removing the filter."
                : "No outfit suggestions available."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
