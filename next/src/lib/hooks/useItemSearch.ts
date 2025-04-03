import { useState, useEffect } from 'react'
import { ItemsResponse } from '@/lib/client'
import { itemTypeIcons } from '@/components/Item'

interface UseItemSearchProps {
  items: ItemsResponse['items']
  typeFilter?: keyof typeof itemTypeIcons | null
  archiveFilter?: boolean | null
}

interface UseItemSearchResult {
  searchTerm: string
  setSearchTerm: (value: string) => void
  addMode: boolean
  setAddMode: (value: boolean) => void
  highlightedIndex: number
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>
  filteredItems: ItemsResponse['items']
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleNewItem: (itemId: string, itemType: string) => void
}

export function useItemSearch({
  items,
  typeFilter = null,
  archiveFilter = null
}: UseItemSearchProps): UseItemSearchResult {
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [addMode, setAddMode] = useState(false)

  // Filter items based on search term, type filter, and archive filter
  const filteredItems = items.filter(item => {
    const typeMatch = typeFilter ? item.type === typeFilter : true
    
    // Archive match - only filter by archive status if archiveFilter is not null
    const archiveMatch = archiveFilter === null ? true : (archiveFilter ? item.isArchived : !item.isArchived)
    
    // Search match - check if search term is in name, brand, or type
    let searchMatch = true
    if (searchTerm && !addMode) {
      const searchTerms = searchTerm.toLowerCase().split(/\s+/)
      const itemName = item.name.toLowerCase()
      const itemBrand = (item.brand || '').toLowerCase()
      const itemType = item.type.toLowerCase()
      
      searchMatch = searchTerms.every(term => 
        itemName.includes(term) || 
        itemBrand.includes(term) ||
        itemType.includes(term)
      )
    }
    
    return typeMatch && archiveMatch && searchMatch
  })

  // Automatically switch to add mode when no search results are found
  useEffect(() => {
    if (searchTerm && !addMode) {
      const hasSearchResults = items.some(item => {
        const typeMatch = typeFilter ? item.type === typeFilter : true
        const archiveMatch = archiveFilter === null ? true : (archiveFilter ? item.isArchived : !item.isArchived)
        
        const searchTerms = searchTerm.toLowerCase().split(/\s+/)
        const itemName = item.name.toLowerCase()
        const itemBrand = (item.brand || '').toLowerCase()
        const itemType = item.type.toLowerCase()
        
        const searchMatch = searchTerms.every(term => 
          itemName.includes(term) || 
          itemBrand.includes(term) ||
          itemType.includes(term)
        )
        
        return typeMatch && archiveMatch && searchMatch
      })
      
      // If we have a search term and no results, switch to add mode
      if (!hasSearchResults && searchTerm.trim().length >= 2) {
        setAddMode(true)
      }
    }
  }, [searchTerm, items, typeFilter, archiveFilter, addMode])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setHighlightedIndex(-1)
    
    // If we're in add mode and the search term was cleared, go back to search mode
    if (addMode && !e.target.value) {
      setAddMode(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If in add mode, let the component handle its own keyboard navigation
    if (addMode) return
    
    const totalItems = filteredItems.length
    if (!totalItems) return
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => 
        prev < totalItems - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setSearchTerm('')
      setHighlightedIndex(-1)
    }
  }

  const handleNewItem = (itemId: string, itemType: string) => {
    // Reset the search state
    setSearchTerm('')
    setAddMode(false)
  }

  return {
    searchTerm,
    setSearchTerm,
    addMode,
    setAddMode,
    highlightedIndex,
    setHighlightedIndex,
    filteredItems,
    handleSearchChange,
    handleKeyDown,
    handleNewItem
  }
} 