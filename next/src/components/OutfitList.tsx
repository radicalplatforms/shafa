'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Outfit } from '@/types/outfit'
import { Skeleton } from '@/components/ui/skeleton'
import { client } from '@/lib/client'
import { Calendar, Star } from 'lucide-react'
import { Item } from '@/components/Item'

export default function OutfitList() {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchOutfits = async () => {
    try {
      setLoading(true)
      const response = await client.outfits.$get({
        query: { page: page.toString(), size: '10' }
      })
      const data = await response.json()
      setOutfits(prevOutfits => [...prevOutfits, ...data.outfits])
      setHasMore(!data.last_page)
      setPage(prevPage => prevPage + 1)
    } catch (err) {
      setError('Failed to load outfits. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOutfits()
  }, [])

  if (error) {
    return <div className="text-destructive">{error}</div>
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {outfits.map((outfit) => (
          <Card key={`outfit-${outfit.id}`} className="overflow-hidden bg-card hover:bg-accent transition-colors duration-300 fade-in">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-1 h-4 w-4" />
                  {new Date(outfit.wearDate).toLocaleDateString()}
                </span>
                <span className="flex items-center text-sm text-muted-foreground">
                  <Star className="mr-1 h-4 w-4" />
                  {outfit.rating}/5
                </span>
              </div>
              <ul className="space-y-3">
                {outfit.itemsToOutfits.map((itemToOutfit) => (
                  <li key={`outfit-${outfit.id}-item-${itemToOutfit.item.id}`}>
                    <Item item={itemToOutfit.item} itemType={itemToOutfit.itemType} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      {loading && <OutfitSkeleton />}
      {hasMore && !loading && (
        <button
          onClick={fetchOutfits}
          className="mt-6 px-4 py-2 w-full bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors duration-300"
        >
          Load More
        </button>
      )}
    </div>
  )
}

function OutfitSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, index) => (
        <Card key={`outfit-skeleton-${index}`} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
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
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

