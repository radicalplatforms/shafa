'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Outfit } from '@/types/outfit'
import { client } from '@/lib/client'
import { Calendar, Star } from 'lucide-react'
import { ItemList } from '@/components/ItemList'
import OutfitListLoading from './OutfitListLoading'
import { Rating } from '@/components/ui/rating'
import { AddOutfitModal } from '@/components/AddOutfitModal'

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

  useEffect(() => {
    const fetchOutfits = async () => {
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
    }

    fetchOutfits()
  }, [page])

  useEffect(() => {
    const handleOutfitCreated = () => {
      setPage(0)  // Reset to first page
      setOutfits([])  // Clear existing outfits
      setLoading(true)  // Show loading state
    }

    window.addEventListener('outfitCreated', handleOutfitCreated)
    return () => window.removeEventListener('outfitCreated', handleOutfitCreated)
  }, [])

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {outfits.map((outfit, index) => (
        <div
          key={`outfit-${outfit.id}`}
          ref={index === outfits.length - 1 ? lastOutfitElementRef : null}
          className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Card className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 h-full">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-1 h-4 w-4" />
                  {formatDate(outfit.wearDate)}
                </span>
                <Rating rating={outfit.rating + 1} />
              </div>
              <ItemList items={outfit.itemsToOutfits} />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
