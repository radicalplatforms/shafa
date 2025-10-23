import { useState, useEffect, useMemo } from 'react'

interface UseOutfitSearchProps<T> {
  outfits: T[]
  allItems: Array<{ id: string; name: string; brand?: string | null; type: string }>
  allTags: Array<{ id: string; name: string }> | undefined
  onNewItem?: (itemId: string, itemType: string) => void
}

interface UseOutfitSearchResult<T> {
  searchTerm: string
  addMode: boolean
  filteredOutfits: T[]
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleNewItem: (itemId: string, itemType: string) => void
}

/**
 * Hook for searching and filtering outfits by items and tags.
 * 
 * @param outfits - Array of outfits or suggestions to filter
 * @param allItems - All available items for lookup
 * @param allTags - All available tags for lookup
 * @param onNewItem - Callback when a new item is created
 * @returns Search state and filtered outfits
 */
export function useOutfitSearch<T extends { outfitItems: Array<{ itemId: string }>; outfitTags?: Array<{ tagId: string }> }>({
  outfits,
  allItems,
  allTags,
  onNewItem
}: UseOutfitSearchProps<T>): UseOutfitSearchResult<T> {
  const [searchTerm, setSearchTerm] = useState('')
  const [addMode, setAddMode] = useState(false)

  const filteredOutfits = useMemo(() => {
    if (!searchTerm) return outfits

    const searchTerms = searchTerm.toLowerCase().split(/\s+/)

    return outfits.filter(outfit => {
      return searchTerms.every(term => {
        // Check items in outfit
        const matchesItem = outfit.outfitItems.some(outfitItem => {
          const item = allItems.find(i => i.id === outfitItem.itemId)
          if (!item) return false
          
          const itemName = item.name.toLowerCase()
          const itemBrand = (item.brand || '').toLowerCase()
          const itemType = item.type.toLowerCase()
          
          return itemName.includes(term) || 
                 itemBrand.includes(term) || 
                 itemType.includes(term)
        })

        // Check tags in outfit
        const matchesTag = outfit.outfitTags?.some(outfitTag => {
          const tag = allTags?.find(t => t.id === outfitTag.tagId)
          if (!tag) return false
          return tag.name.toLowerCase().includes(term)
        }) || false

        return matchesItem || matchesTag
      })
    })
  }, [outfits, searchTerm, allItems, allTags])

  useEffect(() => {
    if (searchTerm && filteredOutfits.length === 0) {
      if (searchTerm.trim().length >= 2) {
        setAddMode(true)
      }
    }
  }, [searchTerm, filteredOutfits.length])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    
    if (addMode && !e.target.value) {
      setAddMode(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (addMode) return
    
    if (e.key === 'Escape') {
      e.preventDefault()
      setSearchTerm('')
    }
  }

  const handleNewItem = (itemId: string, itemType: string) => {
    setSearchTerm('')
    setAddMode(false)
    onNewItem?.(itemId, itemType)
  }

  return {
    searchTerm,
    addMode,
    filteredOutfits,
    handleSearchChange,
    handleKeyDown,
    handleNewItem
  }
}
