'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { OutfitSuggestion } from '@/types/outfitSuggestion'
import { Skeleton } from '@/components/ui/skeleton'
import { client } from '@/lib/client'
import { Star, Zap } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Item } from '@/components/Item'

export default function OutfitSuggestions() {
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const response = await client.outfits.suggest.$get({
        query: { page: page.toString(), size: '10' }
      })
      const data = await response.json()
      setSuggestions(prevSuggestions => [...prevSuggestions, ...data.suggestions])
      setHasMore(!data.metadata.last_page)
      setPage(prevPage => prevPage + 1)
    } catch (err) {
      setError('Failed to load outfit suggestions. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuggestions()
  }, [])

  if (error) {
    return <div className="text-destructive">{error}</div>
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((suggestion) => (
          <Card key={`suggestion-${suggestion.id}`} className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 fade-in">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="flex items-center text-sm text-muted-foreground">
                  <Zap className="mr-1 h-4 w-4" />
                  Suggested Outfit
                </span>
                <span className="flex items-center text-sm text-muted-foreground">
                  <Star className="mr-1 h-4 w-4" />
                  {suggestion.rating}/5
                </span>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium mb-1">Suggestion Score</p>
                <Progress value={suggestion.scoring_details.total_score * 10} className="w-full" />
                <p className="text-xs text-right mt-1">{suggestion.scoring_details.total_score.toFixed(2)}</p>
              </div>
              <ul className="space-y-3">
                {suggestion.itemsToOutfits.map((itemToOutfit) => (
                  <li key={`suggestion-${suggestion.id}-item-${itemToOutfit.item.id}`}>
                    <Item item={itemToOutfit.item} itemType={itemToOutfit.itemType} />
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-muted-foreground">
                <p>Last worn: {suggestion.scoring_details.raw_data.days_since_worn} days ago</p>
                <p>Wear count: {suggestion.scoring_details.raw_data.wear_count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {loading && <SuggestionSkeleton />}
      {hasMore && !loading && (
        <button
          onClick={fetchSuggestions}
          className="mt-6 px-4 py-2 w-full bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors duration-300"
        >
          Load More
        </button>
      )}
    </div>
  )
}

function SuggestionSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, index) => (
        <Card key={`suggestion-skeleton-${index}`} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-2 w-full mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={`item-skeleton-${i}`} className="flex items-center mb-3">
                <Skeleton className="h-5 w-5 mr-3" />
                <Skeleton className="w-10 h-10 rounded-full mr-3" />
                <div className="flex-grow">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
            <div className="mt-4">
              <Skeleton className="h-3 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

