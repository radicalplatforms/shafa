'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PlusCircle, X, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SelectableItem, itemTypeIcons } from '@/components/SelectableItem'
import Rating from './ui/rating'
import { Tag } from "@/components/ui/tag"
import { client, useItems, useTags, useOutfits } from '@/lib/client'
import { useAuth } from '@clerk/nextjs'
import { ItemInlineSearch } from './ItemInlineSearch'
import { useLocation } from '@/lib/hooks/useLocation'
import type { ItemStatus } from '@/lib/types'

interface AddOutfitModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  onSuccess?: () => void
}

export function AddOutfitModal({ 
  open: controlledOpen, 
  onOpenChange,
  showTrigger = true,
  onSuccess
}: AddOutfitModalProps) {
  const getStartOfToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  const { getToken } = useAuth()
  const { data: locationData, status: locationStatus, requestLocation, clearLocation } = useLocation()

  const [open, setOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [date, setDate] = useState<Date | null>(getStartOfToday())
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingRating, setSubmittingRating] = useState<number | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { items: allItems, isLoading: isItemsLoading, updateItemStatus, mutate: mutateItems } = useItems()
  const [selectedItems, setSelectedItems] = useState<Array<{id: string, type: string}>>([])

  const { tags } = useTags()
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Add state for highlighted index
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  
  // Add state for status changes
  const [statusChangingItemId, setStatusChangingItemId] = useState<string | null>(null)
  const [changingToStatus, setChangingToStatus] = useState<ItemStatus | null>(null)

  // Add ref for the scroll area
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Add ref for detecting clicks outside
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { mutate: mutateOutfits } = useOutfits()

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && selectedItems.length === 0) {
      setDate(getStartOfToday())
    }
    setOpen(newOpen)
    onOpenChange?.(newOpen)
    setSearchTerm('')
    setShowDropdown(false)

    // Automatically request location when modal opens
    if (newOpen) {
      requestLocation()
    }

    // Focus the search input when modal opens
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 200)
  }

  const isOpen = controlledOpen ?? open

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId))
  }

  const handleSubmit = async (rating: 0 | 1 | 2) => {
    if (selectedItems.length === 0) {
      return
    }

    setIsSubmitting(true)
    setSubmittingRating(rating)

    const outfitData = {
      wearDate: date,
      rating: rating,
      itemIdsTypes: selectedItems.map(item => ({ id: item.id, itemType: item.type })),
      tagIds: selectedTags,
      ...(locationData && {
        locationLatitude: locationData.latitude,
        locationLongitude: locationData.longitude,
      })
    }

    try {
      const res = await client.api.outfits.$post({ json: outfitData }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        }
      })

      if (res.ok) {
        // Refresh outfits data
        await mutateOutfits()
        
        // Reset all state variables
        setSelectedItems([])
        setDate(getStartOfToday())
        setSearchTerm('')
        setShowDropdown(false)
        setSelectedTags([])
        
        handleOpenChange(false)
        onSuccess?.()
      } else {
        console.error('Failed to create outfit via API:', res.status, await res.text())
      }
    } catch (error) {
      console.error('Request Error:', error)
    } finally {
      setIsSubmitting(false)
      setSubmittingRating(null)
    }
  }

  const handleItemSelect = (itemId: string, itemType: string) => {
    const hasExistingTop = selectedItems.some(selected => selected.type === 'top')
    const newItemType = itemType === 'top' && hasExistingTop ? 'layer' : itemType

    setSelectedItems([...selectedItems, {id: itemId, type: newItemType}])
    setSearchTerm('')
    setShowDropdown(false)
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  const handleStatusChange = async (itemId: string, newStatus: ItemStatus) => {
    setStatusChangingItemId(itemId)
    setChangingToStatus(newStatus)
    try {
      const success = await updateItemStatus(itemId, newStatus)
      if (success) {
        // Clear loading state immediately after successful API call
        setStatusChangingItemId(null)
        setChangingToStatus(null)
        // Trigger data refetch in background
        mutateItems()
      }
    } catch (error) {
      // Clear loading state on error too
      setStatusChangingItemId(null)
      setChangingToStatus(null)
    }
  }

  const handleTagToggle = (tagId: string) => {
    // Check if tag is being selected or deselected
    const isSelecting = !selectedTags.includes(tagId)
    
    // Update selected tags list
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
    
    // Find the tag to see if it's the "Idea" tag
    const selectedTag = tags?.find(tag => tag.id === tagId)
    
    // If selecting the "Idea" tag, set date to null
    if (isSelecting && selectedTag?.name === 'Idea') {
      setDate(null)
    }
    // If deselecting the "Idea" tag, reset date to today
    else if (!isSelecting && selectedTag?.name === 'Idea') {
      setDate(getStartOfToday())
    }
  }

  // Filter items locally based on search term and exclude already selected items
  const searchResults = allItems?.filter(item => {
      const searchTerms = searchTerm.toLowerCase().split(/\s+/)
      const itemName = item.name.toLowerCase()
      const itemBrand = (item.brand || '').toLowerCase()
      const itemType = item.type.toLowerCase()
      
      // First check if item is already selected
      const isAlreadySelected = selectedItems.some(selected => selected.id === item.id)
      if (isAlreadySelected) return false

      // Then check if it matches search terms
      return searchTerms.every(term => 
        itemName.includes(term) || 
        itemBrand.includes(term) ||
        itemType.includes(term)
      )
    })

  // Add this type order mapping
  const typeOrder = {
    'layer': 0,
    'top': 1,
    'bottom': 2,
    'footwear': 3,
    'accessory': 4
  }

  // Update handleKeyDown to handle scrolling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults?.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const newIndex = prev < searchResults.length - 1 ? prev + 1 : prev
          // Scroll item into view
          const itemElement = scrollAreaRef.current?.querySelector(`[data-index="${newIndex}"]`)
          itemElement?.scrollIntoView({ block: 'nearest' })
          return newIndex
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : 0
          // Scroll item into view
          const itemElement = scrollAreaRef.current?.querySelector(`[data-index="${newIndex}"]`)
          itemElement?.scrollIntoView({ block: 'nearest' })
          return newIndex
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleItemSelect(searchResults[highlightedIndex].id, searchResults[highlightedIndex].type)
        } else if (searchResults.length > 0) {
          handleItemSelect(searchResults[0].id, searchResults[0].type)
        }
        break
    }
  }

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [searchTerm])

  // Add effect to handle clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showDropdown])

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <PlusCircle className="mr-1 h-4 w-4" />
            Log Outfit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="sm:max-w-[550px] p-0 bg-background border-2 shadow-2xl rounded-xl [&>button]:hidden w-[95vw] max-h-[90vh]"
      >
        <div className="sr-only">
          <DialogTitle>Add New Outfit</DialogTitle>
          <DialogDescription>
            Create a new outfit by selecting items, choosing a date, and rating your outfit.
          </DialogDescription>
        </div>
        <div className="px-4 sm:px-6 mt-5">
          <ScrollArea className="max-h-fit">
            <div className="space-y-2">
              {selectedItems
                .sort((a, b) => {
                  const orderA = typeOrder[a.type as keyof typeof typeOrder] ?? 999
                  const orderB = typeOrder[b.type as keyof typeof typeOrder] ?? 999
                  return orderA - orderB
                })
                .map((selectedItem) => {
                  const item = allItems?.find(i => i.id === selectedItem.id)
                  if (!item) return null
                  return (
                    <div key={item.id} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <SelectableItem 
                          item={item} 
                          itemType={selectedItem.type as keyof typeof itemTypeIcons}
                          showLastWornAt
                          showThreeDotsMenu
                          isStatusChanging={statusChangingItemId === item.id}
                          changingToStatus={changingToStatus || undefined}
                          onStatusChange={handleStatusChange}
                          className="hover:bg-transparent"
                        />
                      </div>
                      <div className="flex-shrink-0 flex items-center mt-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-8 w-8 p-0 hover:bg-muted/50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </ScrollArea>
          {selectedItems.length > 0 && <div className="mt-4"></div>}
          <div className="relative mt-0">
            <ItemInlineSearch
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              onClick={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              addMode={searchResults.length < 1}
              onNewItem={handleItemSelect}
            />
            {showDropdown && (searchResults?.length > 0 || isItemsLoading) && (
              <div 
                ref={dropdownRef}
                className="absolute z-10 mt-1 w-full rounded-md bg-card shadow-lg max-w-[100%]"
              >
                <ScrollArea 
                  ref={scrollAreaRef}
                  className={cn(
                    "rounded-md border",
                    // Adaptive height based on number of items
                    searchResults && searchResults.length <= 1 ? "h-[72.5px]" :
                    searchResults && searchResults.length <= 2 ? "h-[120px]" :
                    searchResults && searchResults.length <= 3 ? "h-[180px]" :
                    "h-[250px]"
                  )}
                >
                  {isItemsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <ul className="py-2">
                      {searchResults?.map((item, index) => (
                        <li
                          key={item.id}
                          data-index={index}
                          className={cn(
                            "px-4 py-2 cursor-pointer transition-colors group flex items-center justify-between",
                            highlightedIndex === index ? "bg-accent" : "hover:bg-accent/50"
                          )}
                          onClick={() => handleItemSelect(item.id, item.type)}
                          onMouseEnter={() => setHighlightedIndex(index)}
                        >
                          <div className="flex-1">
                            <SelectableItem 
                              item={item} 
                              itemType={item.type as keyof typeof itemTypeIcons}
                              showLastWornAt
                              isStatusChanging={statusChangingItemId === item.id}
                              changingToStatus={changingToStatus || undefined}
                              onStatusChange={handleStatusChange}
                              className="hover:bg-transparent"
                            />
                          </div>
                          {highlightedIndex === index && (
                            <div className="hidden md:flex w-[80px] ml-[10px] text-xs text-muted-foreground items-center gap-1">
                              <kbd className="px-2 py-0.5 text-xs bg-muted border border-border rounded">
                                ↵
                              </kbd>
                              <span>to add</span>
                            </div>
                          )}
                        </li>
                      ))}
                      {!searchResults?.length && searchTerm.length > 1 && (
                        <li className="px-4 py-2 text-muted-foreground">No items found</li>
                      )}
                    </ul>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
        <div className="sm:max-w-[546px] w-[95vw] justify-end items-center">
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-2 pb-3">
              <div className="px-1"></div>
              {date !== null && (
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className=
                        "py-1 transition-colors whitespace-nowrap bg-transparent px-3 h-7 text-xs flex items-center gap-1.5 hover:bg-muted/50"
                      
                    >
                      {format(date, "EEE, MMM d")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start">
                    <div className="flex flex-col">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(day) => {
                          setDate(day || getStartOfToday())
                          setDatePickerOpen(false)
                        }}
                        initialFocus
                        className="rounded-md border"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {/* Location indicator */}
              {locationStatus !== 'denied' && (
                <Button
                  variant="outline"
                  className="py-1 transition-colors whitespace-nowrap bg-transparent px-3 h-7 text-xs flex items-center gap-1.5 hover:bg-muted/50"
                  disabled={locationStatus === 'loading'}
                  onClick={() => {
                    if (locationStatus === 'success' && locationData) {
                      clearLocation()
                    } else {
                      requestLocation()
                    }
                  }}
                >
                  {locationStatus === 'loading' && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Locating...
                    </>
                  )}
                  {locationStatus === 'success' && locationData && (
                    `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`
                  )}
                  {locationStatus === 'error' && 'Error'}
                  {locationStatus === 'idle' && 'Locate'}
                </Button>
              )}
              {tags?.map((tag) => (
                <Tag
                  key={tag.id}
                  name={tag.name}
                  hexColor={tag.hexColor}
                  selected={selectedTags.includes(tag.id)}
                  onClick={() => handleTagToggle(tag.id)}
                  compact={false}
                />
              ))}
              <div className="px-1"></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 rounded-b-sm py-4 px-4 sm:px-6 border-t">
            {[
              { rating: 2, label: 'Hit' },
              { rating: 1, label: 'Mid' },
              { rating: 0, label: 'Miss' }
            ].map(({ rating, label }) => (
              <Button
                key={label}
                onClick={() => handleSubmit(rating as 0 | 1 | 2)}
                disabled={isSubmitting}
                className={`w-full sm:w-auto bg-background text-foreground border-[1px] hover:bg-muted border-border shadow-sm transition-colors`}
              >
                {isSubmitting && submittingRating === rating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rating rating={rating as 0 | 1 | 2} />
                )}
                {label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
