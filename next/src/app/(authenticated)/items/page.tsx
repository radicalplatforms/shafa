'use client'

import React, { Suspense } from 'react'
import { useState } from 'react'
import { useItems } from '@/lib/client'
import { useItemSearch } from '@/lib/hooks/useItemSearch'
import { Card, CardContent } from '@/components/ui/card'
import { ItemListLoading } from '@/components/ItemListLoading'
import { Item, itemTypeIcons } from '@/components/Item'
import { Button } from '@/components/ui/button'
import { Archive, ArchiveRestore } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { ItemInlineSearch } from '@/components/ItemInlineSearch'
import ItemsLoading from './loading'

// Separate component for Items content to use with Suspense
function ItemsContent() {
  const { items, isLoading, archiveItem, mutate } = useItems()
  const [selectedType, setSelectedType] = useState<keyof typeof itemTypeIcons | null>(null)
  
  const {
    searchTerm,
    addMode,
    highlightedIndex,
    filteredItems: baseFilteredItems,
    handleSearchChange,
    handleKeyDown,
    handleNewItem: baseHandleNewItem,
  } = useItemSearch({
    items,
    typeFilter: selectedType,
    // No longer filtering by archive status in the hook
    archiveFilter: null
  })

  // Sort items to show archived items at the end
  const filteredItems = [...baseFilteredItems].sort((a, b) => {
    // First sort by archive status (non-archived first)
    if (a.isArchived !== b.isArchived) {
      return a.isArchived ? 1 : -1;
    }
    
    // For non-archived items, sort by lastWornAt (oldest first)
    if (!a.isArchived && !b.isArchived) {
      // Items without lastWornAt should be first (never worn)
      if (!a.lastWornAt && b.lastWornAt) return -1;
      if (a.lastWornAt && !b.lastWornAt) return 1;
      
      // If both have lastWornAt dates, sort oldest first
      if (a.lastWornAt && b.lastWornAt) {
        return new Date(a.lastWornAt).getTime() - new Date(b.lastWornAt).getTime();
      }
    }
    
    // If archive status is the same and other criteria don't apply, preserve original order
    return 0;
  });

  // Function to determine which date category an item belongs to
  const getDateCategory = (item: typeof filteredItems[0]) => {
    if (item.isArchived) return 'archived';
    if (!item.lastWornAt) return 'never';
    
    const lastWorn = new Date(item.lastWornAt);
    const now = new Date();
    
    // Calculate a week ago
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    
    // Check if worn in the last week
    if (lastWorn >= weekAgo) return 'last-week';
    
    // Check if worn this month
    if (lastWorn.getMonth() === now.getMonth() && 
        lastWorn.getFullYear() === now.getFullYear()) {
      return 'this-month';
    }
    
    // Otherwise, categorize by month-year
    return `${lastWorn.getFullYear()}-${lastWorn.getMonth()}`;
  }
  
  // Group items by date category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    const category = getDateCategory(item);
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof filteredItems>);
  
  // Function to get a human-readable title for a category
  const getCategoryTitle = (category: string) => {
    if (category === 'archived') return 'Archived Items';
    if (category === 'never') return 'Never Worn';
    if (category === 'last-week') return 'Worn in the Last Week';
    if (category === 'this-month') {
      return `Worn in ${new Date().toLocaleString('default', { month: 'long' })}`;
    }
    
    const [year, month] = category.split('-').map(Number);
    const date = new Date(year, month);
    return `Worn in ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
  }
  
  // Sort categories in the desired order
  const getCategoryOrder = (category: string) => {
    if (category === 'archived') return 1000; // Always at the end
    
    // Now order from oldest to newest for non-archived items
    if (category === 'never') return 100; // First
    
    // For month-year categories, sort by date (oldest first)
    if (category.includes('-')) {
      const [year, month] = category.split('-').map(Number);
      const now = new Date();
      const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() - month);
      return 200 + (100 - monthsAgo); // Higher monthsAgo = lower order number = earlier in list
    }
    
    if (category === 'this-month') return 900;
    if (category === 'last-week') return 950;
    
    return 500; // Default position for any other categories
  }
  
  // Get categories in sorted order
  const sortedCategories = Object.keys(itemsByCategory).sort(
    (a, b) => getCategoryOrder(a) - getCategoryOrder(b)
  );

  // Function to find the global index of an item in the filtered items list 
  // based on its position within its category
  const getGlobalIndex = (categoryIndex: number, itemIndex: number) => {
    let count = 0;
    for (let i = 0; i < categoryIndex; i++) {
      const category = sortedCategories[i];
      count += itemsByCategory[category].length;
    }
    return count + itemIndex;
  };

  // Function to get the index of an item for highlighting
  const isHighlighted = (categoryIndex: number, itemIndex: number) => {
    const globalIndex = getGlobalIndex(categoryIndex, itemIndex);
    return globalIndex === highlightedIndex;
  };

  if (isLoading) {
    return <ItemsLoading />
  }

  const itemTypes = Object.keys(itemTypeIcons) as Array<keyof typeof itemTypeIcons>

  const handleTypeClick = (type: keyof typeof itemTypeIcons) => {
    if (selectedType === type) {
      // If the same type is clicked again, clear the filter
      setSelectedType(null)
    } else {
      // Otherwise set the selected type
      setSelectedType(type)
    }
  }

  const handleArchiveToggle = async (itemId: string, currentStatus: boolean) => {
    await archiveItem(itemId, !currentStatus)
  }

  const handleNewItem = (itemId: string, itemType: string) => {
    // Call the base handler
    baseHandleNewItem(itemId, itemType)
    
    // Additional logic specific to ItemsPage
    mutate()
    
    // If a type filter is active, optionally set it to the newly created item's type
    if (selectedType !== itemType && itemType) {
      setSelectedType(itemType as keyof typeof itemTypeIcons)
    }
  }

  return (
    <div className="space-y-6">
      {/* Type filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2 pb-1">
          {itemTypes.map((type) => {
            const Icon = itemTypeIcons[type]
            return (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => handleTypeClick(type)}
                className={`
                  py-1 transition-colors whitespace-nowrap bg-transparent
                  px-2 h-7
                  ${selectedType === type ? "border" : "hover:bg-muted/50 border-dashed"}
                  flex items-center gap-1.5
                `}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className={`text-xs ${selectedType === type ? "" : "text-gray-400"}`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Items list */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          {/* Search input */}
          <div className="mb-4 ml-1">
            <ItemInlineSearch
              value={searchTerm}
              onChange={handleSearchChange}
              onClick={() => {}}
              onKeyDown={handleKeyDown}
              addMode={addMode}
              onNewItem={handleNewItem}
            />
          </div>

          {!addMode && filteredItems.length > 0 ? (
            <ul className="space-y-1">
              {sortedCategories.map((category, categoryIndex) => {
                return (
                  <React.Fragment key={category}>
                    <li className={`${categoryIndex > 0 ? 'mt-4' : ''} pb-1`}>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide border-t pt-2 mt-4">
                        {getCategoryTitle(category)}
                      </div>
                    </li>
                    {itemsByCategory[category].map((item, itemIndex) => {
                      return (
                        <li 
                          key={item.id}
                          className={`text-sm block ${isHighlighted(categoryIndex, itemIndex) ? 'bg-accent rounded-md' : ''} 
                                     ${item.isArchived ? 'opacity-70' : ''}`}
                        >
                          <ContextMenu>
                            <ContextMenuTrigger className="block w-full">
                              <div className={`p-1 ${isHighlighted(categoryIndex, itemIndex) ? 'bg-accent rounded-md' : ''}`}>
                                <Item
                                  item={item}
                                  itemType={item.type as keyof typeof itemTypeIcons}
                                  showLastWornAt={true}
                                />
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem
                                onClick={() => handleArchiveToggle(item.id, item.isArchived)}
                              >
                                {item.isArchived ? (
                                  <>
                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                    <span>Unarchive Item</span>
                                  </>
                                ) : (
                                  <>
                                    <Archive className="mr-2 h-4 w-4" />
                                    <span>Archive Item</span>
                                  </>
                                )}
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        </li>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </ul>
          ) : !addMode ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "No items found matching your search criteria. Keep typing to create a new item."
                  : "No items found with the selected filter."}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

// Main component that uses Suspense
export default function ItemsPage() {
  return (
    <Suspense fallback={<ItemsLoading />}>
      <ItemsContent />
    </Suspense>
  )
} 