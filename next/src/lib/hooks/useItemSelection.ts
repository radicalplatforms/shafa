import { useState, useCallback } from 'react'
import { useItems } from '@/lib/client'
import type { ItemStatus } from '@/lib/types'

export function useItemSelection() {
  const { updateItemStatus, mutate } = useItems()
  
  // Selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  
  // Status change state
  const [statusChangingItemId, setStatusChangingItemId] = useState<string | null>(null)
  const [changingToStatus, setChangingToStatus] = useState<ItemStatus | null>(null)

  // Selection handlers
  const handleToggleSelection = useCallback((itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedItemIds(new Set())
  }, [])

  const handleBatchStatusChange = useCallback(async (newStatus: ItemStatus) => {
    if (selectedItemIds.size === 0) return

    setIsBatchUpdating(true)
    setChangingToStatus(newStatus)
    try {
      // Update all selected items in parallel
      const updatePromises = Array.from(selectedItemIds).map(itemId => 
        updateItemStatus(itemId, newStatus)
      )
      
      const results = await Promise.allSettled(updatePromises)
      
      // Check if any updates failed
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some batch updates failed:', failures)
        // You might want to show a toast notification here
      }
      
      // Clear selection and refresh data
      setSelectedItemIds(new Set())
      mutate()
    } catch (error) {
      console.error('Batch update error:', error)
    } finally {
      setIsBatchUpdating(false)
      setChangingToStatus(null)
    }
  }, [selectedItemIds, updateItemStatus, mutate])

  const handleStatusChange = useCallback(async (itemId: string, newStatus: ItemStatus) => {
    setStatusChangingItemId(itemId)
    setChangingToStatus(newStatus)
    try {
      const success = await updateItemStatus(itemId, newStatus)
      if (success) {
        // Clear loading state immediately after successful API call
        setStatusChangingItemId(null)
        setChangingToStatus(null)
        // Trigger data refetch in background
        mutate()
      } else {
        // If the API call didn't succeed, clear loading state
        setStatusChangingItemId(null)
        setChangingToStatus(null)
      }
    } catch (error) {
      console.error('Status change failed:', error)
      // Clear loading state on error
      setStatusChangingItemId(null)
      setChangingToStatus(null)
    }
  }, [updateItemStatus, mutate])

  return {
    // Selection state
    selectedItemIds,
    isBatchUpdating,
    
    // Status change state
    statusChangingItemId,
    changingToStatus,
    
    // Handlers
    handleToggleSelection,
    handleClearSelection,
    handleBatchStatusChange,
    handleStatusChange,
  }
}
