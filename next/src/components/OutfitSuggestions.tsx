'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { client } from '@/lib/client'
import { Zap } from 'lucide-react'
import { SuggestionScoreBar } from '@/components/SuggestionScoreBar'
import { ItemList } from '@/components/ItemList'
import OutfitSuggestionsLoading from './OutfitSuggestionsLoading'
import Rating from '@/components/ui/rating'
import { AddOutfitModal } from '@/components/AddOutfitModal'

export default function OutfitSuggestions() {
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [maxScore, setMaxScore] = useState<number | null>(null)
  const observer = useRef<IntersectionObserver | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<OutfitSuggestion | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const lastSuggestionElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, hasMore])

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await client.api.outfits.suggest.$get({
          query: { 
            page: page.toString(), 
            size: 12
          }
        })
        const data = await response.json()
        setSuggestions(prevSuggestions => 
          page === 0 ? data.suggestions : [...prevSuggestions, ...data.suggestions]
        )
        setHasMore(!data.metadata.last_page)
        
        // Set the max score based on the first suggestion's total score
        if (data.suggestions.length > 0 && maxScore === null) {
          setMaxScore(data.suggestions[0].scoring_details.total_score)
        }
      } catch (err) {
        setError('Failed to load outfit suggestions. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestions()
  }, [page, maxScore])

  useEffect(() => {
    const handleOutfitCreated = () => {
      setPage(0)  // Reset to first page
      setSuggestions([])  // Clear existing suggestions
      setMaxScore(null)  // Reset max score
      setLoading(true)  // Show loading state
    }

    window.addEventListener('outfitCreated', handleOutfitCreated)
    return () => window.removeEventListener('outfitCreated', handleOutfitCreated)
  }, [])

  const handleSuggestionClick = (suggestion: OutfitSuggestion) => {
    setSelectedSuggestion(suggestion)
    setIsModalOpen(true)
  }

  if (loading && page === 0) {
    return <OutfitSuggestionsLoading />
  }

  if (error) {
    return <div className="text-destructive">{error}</div>
  }

  return (
    <>
      {/* <AddOutfitModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialItems={selectedSuggestion?.itemsToOutfits
          .filter((itemToOutfit: ItemToOutfit): itemToOutfit is ItemToOutfit & { item: NonNullable<ItemToOutfit['item']> } => 
            itemToOutfit.item !== undefined
          )
          .map((itemToOutfit) => ({
            ...itemToOutfit.item,
            itemType: itemToOutfit.itemType as "layer" | "top" | "bottom" | "footwear" | "accessory"
          }))}
        showTrigger={false}
        onSuccess={() => {
          window.dispatchEvent(new Event('outfitCreated'))
        }}
      /> */}
      
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
                  <span 
                    className="suggestion-header flex items-center text-xs sm:text-sm text-muted-foreground"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Zap className="zap-icon mr-1 h-4 w-4" />
                    Suggested Outfit
                  </span>
                  <Rating rating={suggestion.rating as 0 | 1 | 2} />
                </div>
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Suggestion Score</p>
                  <SuggestionScoreBar
                    totalScore={suggestion.scoring_details.total_score}
                    maxScore={maxScore || suggestion.scoring_details.total_score}
                    categories={[
                      { name: 'Base', score: suggestion.scoring_details.base_score, color: '#2563eb' }, // Bright blue - authority/foundation
                      { name: 'Items', score: suggestion.scoring_details.items_score, color: '#15803d' }, // Deep green - quality/value 
                      { name: 'Time', score: suggestion.scoring_details.time_factor, color: '#d97706' }, // Amber - temporal/aging
                      { name: 'Frequency', score: suggestion.scoring_details.frequency_score, color: '#9333ea' }, // Bright purple - repetition/rhythm
                      { name: 'Day', score: suggestion.scoring_details.day_of_week_score, color: '#dc2626' }, // Bright red - importance/urgency
                      { name: 'Season', score: suggestion.scoring_details.seasonal_score, color: '#0891b2' }, // Bright cyan - nature/cycles
                    ]}
                  />
                </div>
                <div className="divider"></div>
                <ItemList 
                  items={suggestion.itemsToOutfits.map((item: ItemToOutfit) => ({
                    ...item,
                    id: item.itemId || `suggestion-item-${suggestion.id}-${item.itemType}`
                  }))}
                  coreItems={suggestion.scoring_details.raw_data.core_items}
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
    </>
  )
}
