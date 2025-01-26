'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Outfit } from '@/types/outfit'
import { client } from '@/lib/client'
import { Calendar, Star } from 'lucide-react'
import { ItemList } from '@/components/ItemList'
import OutfitListLoading from './OutfitListLoading'
import Rating from '@/components/ui/rating'
import { AddOutfitModal } from '@/components/AddOutfitModal'
import { ScrollArea as ScrollAreaHorizontal } from "@/components/ui/scroll-area"
import { Tag } from "@/components/ui/tag"
export default function OutfitList() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const observer = useRef<IntersectionObserver | null>(null)

  const lastOutfitElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    })
    if (node) observer.current.observe(node)
  }, [loading, hasMore])

  const fetchOutfits = useCallback(async () => {
    try {
      const response = await client.outfits.$get({
        query: { page: page.toString(), size: 24 }
      })
      const data = await response.json()
      setOutfits(prevOutfits => page === 0 ? data.outfits : [...prevOutfits, ...data.outfits])
      setHasMore(!data.last_page)
    } catch (err) {
      setError('Failed to load outfits. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchOutfits()
  }, [page, fetchOutfits])

  useEffect(() => {
    const handleOutfitCreated = () => {
      setPage(0)  // Reset to first page
      setOutfits([])  // Clear existing outfits
      setLoading(true)  // Show loading state
      fetchOutfits() // Immediately fetch new data
    }

    window.addEventListener('outfitCreated', handleOutfitCreated)
    return () => window.removeEventListener('outfitCreated', handleOutfitCreated)
  }, [fetchOutfits])

  if (loading && page === 0) {
    return <OutfitListLoading />
  }

  if (error) {
    return <div className="text-destructive">{error}</div>
  }

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

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {outfits.map((outfit, index) => (
        <div
          key={`outfit-${outfit.id}`}
          ref={index === outfits.length - 1 ? lastOutfitElementRef : null}
          className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Card className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 h-full">
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <span className="flex items-center text-xs sm:text-sm text-muted-foreground">
                  <Calendar className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  {formatDate(outfit.wearDate)}
                  <div className="flex gap-2 pl-3">
                    {outfit.tagsToOutfits.map((tag) => (
                      <Tag
                        key={tag.tag.id}
                        id={tag.tag.id}
                        name={tag.tag.name}
                        hexColor={tag.tag.hexColor}
                        selected={true}
                      />
                    ))}
                  </div>
                </span>
                <Rating rating={outfit.rating as 0 | 1 | 2} />
              </div>
              <ItemList items={outfit.itemsToOutfits} />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
