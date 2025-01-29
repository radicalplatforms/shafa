'use client'

import { useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Zap } from 'lucide-react'
import { SuggestionScoreBar } from '@/components/SuggestionScoreBar'
import { ItemList } from '@/components/ItemList'
import OutfitSuggestionsLoading from './OutfitSuggestionsLoading'
import Rating from '@/components/ui/rating'
import { useSuggestedOutfits } from '@/lib/client'

export default function OutfitSuggestions() {
  const { 
    suggestions, 
    isLoading, 
    isError, 
    isLoadingMore, 
    isReachingEnd, 
    loadMore 
  } = useSuggestedOutfits()

  const observer = useRef<IntersectionObserver | null>(null)

  const lastSuggestionElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isLoadingMore) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isReachingEnd) {
        loadMore()
      }
    })
    if (node) observer.current.observe(node)
  }, [isLoading, isLoadingMore, isReachingEnd, loadMore])

  if (isLoading && suggestions.length === 0) {
    return <OutfitSuggestionsLoading />
  }

  if (isError) {
    return <div className="text-destructive">{isError.toString()}</div>
  }

  const maxScore = suggestions[0]?.scoring_details.total_score || 0

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {suggestions.map((suggestion, index) => (
        <div
          key={`suggestion-${suggestion.id}`}
          ref={index === suggestions.length - 1 ? lastSuggestionElementRef : null}
          className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Card className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 h-full">
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <span className="suggestion-header flex items-center text-xs sm:text-sm text-muted-foreground">
                  <Zap className="zap-icon mr-1 h-4 w-4" />
                  Suggested Outfit
                </span>
                <Rating rating={suggestion.rating as 0 | 1 | 2} />
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Suggestion Score</p>
                <SuggestionScoreBar
                  totalScore={suggestion.scoring_details.total_score}
                  maxScore={maxScore}
                  categories={[
                    { name: 'Base', score: suggestion.scoring_details.base_score, color: '#2563eb' },
                    { name: 'Items', score: suggestion.scoring_details.items_score, color: '#15803d' },
                    { name: 'Time', score: suggestion.scoring_details.time_factor, color: '#d97706' },
                    { name: 'Frequency', score: suggestion.scoring_details.frequency_score, color: '#9333ea' },
                    { name: 'Day', score: suggestion.scoring_details.day_of_week_score, color: '#dc2626' },
                    { name: 'Season', score: suggestion.scoring_details.seasonal_score, color: '#0891b2' },
                  ]}
                />
              </div>
              <div className="divider"></div>
              <ItemList 
                itemsToOutfits={suggestion.itemsToOutfits}
                coreItems={suggestion.scoring_details.raw_data.core_items as string[]}
              />
              <div className="mt-4 text-xs text-muted-foreground">
                <p>Last worn: {suggestion.scoring_details.raw_data.days_since_worn} days ago</p>
                <p>Wear count: {suggestion.scoring_details.raw_data.wear_count}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
