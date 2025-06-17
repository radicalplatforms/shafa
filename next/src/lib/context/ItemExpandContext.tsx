"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

interface ItemExpandContextProps {
  expandedItemId: string | null
  setExpandedItemId: (id: string | null) => void
  toggleExpandedItem: (id: string) => void
  closeExpandedItem: () => void
}

const ItemExpandContext = createContext<ItemExpandContextProps | undefined>(undefined)

export function ItemExpandProvider({ children }: { children: React.ReactNode }) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Toggle expanded state for an item
  const toggleExpandedItem = useCallback((id: string) => {
    setExpandedItemId(prev => prev === id ? null : id)
  }, [])

  // Close any expanded item
  const closeExpandedItem = useCallback(() => {
    setExpandedItemId(null)
  }, [])

  return (
    <ItemExpandContext.Provider value={{ 
      expandedItemId, 
      setExpandedItemId, 
      toggleExpandedItem,
      closeExpandedItem 
    }}>
      {children}
    </ItemExpandContext.Provider>
  )
}

export function useItemExpand() {
  const context = useContext(ItemExpandContext)
  if (context === undefined) {
    throw new Error('useItemExpand must be used within an ItemExpandProvider')
  }
  return context
} 