'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, X, CalendarIcon, Star, ChevronDown, Loader2, SearchIcon } from 'lucide-react'
import { client } from '@/lib/client'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Item as ItemType, ItemToOutfit, OutfitCreate } from '@/types/outfit'
import { ScrollArea } from "@/components/ui/scroll-area"
import React from 'react'
import { ItemsResponse } from '@/lib/client'
import { ItemTypeButtons, itemTypeIcons } from './ItemTypeButtons'
import { Item } from '@/components/Item'
import Rating from './ui/rating'
import { Tag } from "@/components/ui/tag"
import { ScrollArea as ScrollAreaHorizontal } from "@/components/ui/scroll-area"

type Item = ItemType & {
  type: keyof typeof itemTypeIcons
}

interface ItemWithType extends ItemType {
  itemType: keyof typeof itemTypeIcons
  tags?: string[]
}

interface AddOutfitModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialItems?: Array<ItemType & { itemType: keyof typeof itemTypeIcons }>
  showTrigger?: boolean
  onSuccess?: () => void
}

export function AddOutfitModal({ 
  open: controlledOpen, 
  onOpenChange,
  initialItems,
  showTrigger = true,
  onSuccess
}: AddOutfitModalProps) {
  const getStartOfToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ItemWithType[]>([])
  const [date, setDate] = useState<Date>(getStartOfToday)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Item[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingRating, setSubmittingRating] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [tags, setTags] = useState<Array<{
    id: string
    name: string
    hexColor: string
  }>>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    if (initialItems?.length) {
      // First set the initial items to show something immediately
      setItems(initialItems)
      
      // Then fetch fresh data for each item
      const refreshItemsData = async () => {
        try {
          const refreshedItems = await Promise.all(
            initialItems.map(async (item) => {
              const response = await client.items[':id'].$get({
                param: { id: item.id }
              })
              const freshItemData = await response.json()
              return {
                ...freshItemData,
                itemType: item.itemType // Preserve the itemType from initial data
              } as ItemWithType
            })
          )
          setItems(refreshedItems)
        } catch (error) {
          // If refresh fails, we still have the initial items displayed
          console.error('Failed to refresh items data:', error)
        }
      }

      refreshItemsData()
    }
  }, [initialItems])

  useEffect(() => {
    const searchItems = async () => {
      if (searchTerm.length > 1) {
        setIsSearching(true)
        try {
          const response = await client.items.$get({
            query: { search: searchTerm }
          })
          const data = await response.json()
          if (data && Array.isArray(data.items)) {
            setSearchResults(data.items as Item[])
          } else {
            setSearchResults([])
          }
        } catch (error) {
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }

    const debounce = setTimeout(() => {
      searchItems()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm])

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await client.tags.$get()
        const data = await response.json()
        setTags(data.tags)
      } catch (error) {
        console.error('Failed to fetch tags:', error)
      }
    }

    fetchTags()
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDate(getStartOfToday())
    }
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const isOpen = controlledOpen ?? open

  const handleAddItem = (itemType: keyof typeof itemTypeIcons) => {
    if (selectedItem) {
      const newItem: ItemWithType = { ...(selectedItem as ItemType), itemType }
      const newItems = [...items, newItem].sort((a, b) => {
        const order = ['layer', 'top', 'bottom', 'footwear', 'accessory'];
        return order.indexOf(a.itemType) - order.indexOf(b.itemType);
      });
      setItems(newItems)
      setSelectedItem(null)
      setSearchTerm('')
      setShowDropdown(false)
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
  }

  const handleSubmit = async (rating: 0 | 1 | 2) => {
    if (!date || items.length === 0) {
      return
    }

    setIsSubmitting(true)
    setSubmittingRating(rating)

    const outfitData: OutfitCreate = {
      wearDate: date,
      rating: rating,
      itemIdsTypes: items.map(item => ({ id: item.id, itemType: item.itemType })),
      tagIds: selectedTags
    }

    try {
      const response = await client.outfits.$post({
        json: outfitData
      })
      if (response.ok) {
        // Reset all state variables
        setItems([])
        setDate(getStartOfToday())
        setSearchTerm('')
        setSearchResults([])
        setSelectedItem(null)
        setShowDropdown(false)
        
        handleOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsSubmitting(false)
      setSubmittingRating(null)
    }
  }

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item)
    setSearchTerm(item.name)
    setShowDropdown(false)
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <PlusCircle className="mr-1 h-4 w-4" />
            Add Outfit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="sm:max-w-[550px] p-0 bg-background border-2 shadow-2xl rounded-xl overflow-visible [&>button]:hidden w-[95vw] max-h-[90vh] overflow-y-auto"
      >
        <div className="px-4 sm:px-6 pt-6">
          <div className="flex justify-between items-center gap-4 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-4 w-4" />
                  {date ? format(date, "EEE, MMM d") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(day) => setDate(day || getStartOfToday())}
                  initialFocus
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>

            <DialogClose asChild className="ml-auto">
              <Button variant="ghost" size="icon" className="h-5 w-5 p-4">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <Input
                ref={searchInputRef}
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowDropdown(true)
                }}
                className="pl-[45px] pr-8 text-sm font-normal"
              />
              <SearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transform font-normal" />
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transform font-normal" />
              {showDropdown && (searchResults.length > 0 || isSearching) && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
                  <ScrollArea className="h-[150px] sm:h-[200px] rounded-md border">
                    {isSearching ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <ul className="py-2">
                        {searchResults.map((item) => (
                          <li
                            key={item.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleItemSelect(item)}
                          >
                            <Item 
                              item={item} 
                              itemType={item.type as keyof typeof itemTypeIcons}
                              showLastWornAt
                            />
                          </li>
                        ))}
                        {searchResults.length === 0 && (
                          <li className="px-4 py-2 text-gray-500">No items found</li>
                        )}
                      </ul>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm text-muted-foreground">Save to outfit as:</span>
              <ItemTypeButtons onSelect={handleAddItem} disabled={!selectedItem} />
            </div>
          </div>
          <div className="mt-4">
            <div className="-mx-2">
              <ScrollAreaHorizontal className="w-[calc(100%+16px)]">
                <div className="flex gap-2 pb-4 px-2">
                  {tags.map((tag) => (
                    <Tag
                      key={tag.id}
                      id={tag.id}
                      name={tag.name}
                      hexColor={tag.hexColor}
                      selected={selectedTags.includes(tag.id)}
                      onClick={() => handleTagToggle(tag.id)}
                      compact={false}
                    />
                  ))}
                </div>
              </ScrollAreaHorizontal>
            </div>
            <ScrollArea className="max-h-fit min-h-[100px] sm:h-[250px] px-2">
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 w-full max-w-full overflow-hidden">
                    <div className="flex-1 min-w-0 max-w-[calc(100%-3rem)]">
                      <Item 
                        item={item} 
                        itemType={item.itemType} 
                        showLastWornAt
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveItem(item.id)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
          </div>
        </div>
        <div className="flex justify-end items-center gap-2 rounded-b-sm py-4 px-4 sm:px-6 border-t mt-4">
          {[
            { rating: 2, label: 'Hit' },
            { rating: 1, label: 'Mid' },
            { rating: 0, label: 'Miss' }
          ].map(({ rating, label }) => (
            <Button
              key={label}
              onClick={() => handleSubmit(rating as 0 | 1 | 2)}
              disabled={isSubmitting}
              className={`w-full sm:w-auto text-black bg-white border-[1px] hover:bg-muted border-gray-200 shadow-sm transition-colors`}
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
      </DialogContent>
    </Dialog>
  )
}
