'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, X, CalendarIcon, Star, ChevronDown, Loader2 } from 'lucide-react'
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

type Item = ItemType & {
  type: keyof typeof itemTypeIcons
}

interface ItemWithType extends ItemType {
  itemType: keyof typeof itemTypeIcons
}

interface AddOutfitModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialItems?: Array<ItemType & { itemType: keyof typeof itemTypeIcons }>
  initialRating?: number
  initialDate?: Date
  showTrigger?: boolean
  onSuccess?: () => void
}

export function AddOutfitModal({ 
  open: controlledOpen, 
  onOpenChange,
  initialItems,
  initialRating = 2,
  initialDate,
  showTrigger = true,
  onSuccess
}: AddOutfitModalProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ItemWithType[]>([])
  const [date, setDate] = useState<Date | undefined>(initialDate)
  const [rating, setRating] = useState<number>(3)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Item[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialItems?.length) {
      setItems(initialItems)
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const isOpen = controlledOpen ?? open

  useEffect(() => {
    if (isOpen && initialRating !== undefined) {
      setRating(initialRating + 1)
    }
  }, [isOpen, initialRating])

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

  const handleSubmit = async () => {
    if (!date || rating === 0 || items.length === 0) {
      return
    }

    setIsSubmitting(true)

    const outfitData: OutfitCreate = {
      wearDate: date,
      rating: rating - 1,
      itemIdsTypes: items.map(item => ({ id: item.id, itemType: item.itemType }))
    }

    try {
      const response = await client.outfits.$post({
        json: outfitData
      })
      if (response.ok) {
        handleOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item)
    setSearchTerm(item.name)
    setShowDropdown(false)
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
          <div className="flex justify-between items-center mb-4 sm:hidden">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-5 w-5 cursor-pointer transition-colors",
                    star <= rating ? "text-primary fill-current" : "text-gray-300"
                  )}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 p-4">
                <X className="h-6 w-6" />
              </Button>
            </DialogClose>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[200px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEE, MMM d") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[60]" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
            
            <div className="hidden sm:flex justify-between sm:justify-end items-center w-full sm:w-auto gap-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-5 w-5 cursor-pointer transition-colors",
                      star <= rating ? "text-primary fill-current" : "text-gray-300"
                    )}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-4">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
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
                className="pr-8"
              />
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
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
                            <Item item={item} itemType={item.type as keyof typeof itemTypeIcons} />
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
          <div className="mt-6">
            <ScrollArea className="max-h-fit sm:h-[250px] px-2">
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 w-full max-w-full overflow-hidden">
                    <div className="flex-1 min-w-0 max-w-[calc(100%-3rem)]">
                      <Item item={item} itemType={item.itemType} />
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
        <div className="flex justify-end items-center bg-muted rounded-b-sm py-4 px-4 sm:px-6 border-t mt-4">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Outfit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
