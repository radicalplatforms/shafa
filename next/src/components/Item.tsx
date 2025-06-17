import { Layers, Shirt, Footprints, Crown, Archive, X } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'
import { DateTime } from "luxon"
import { ItemsResponse } from '@/lib/client'
import { cn } from '@/lib/utils'
import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useItemExpand } from '@/lib/context/ItemExpandContext'

export const itemTypeIcons = {
  layer: Layers,
  top: Shirt, 
  bottom: PiPantsFill,
  footwear: Footprints,
  accessory: Crown,
} as const

interface ItemProps {
  item: ItemsResponse['items'][number]
  itemType: keyof typeof itemTypeIcons
  isCoreItem?: boolean
  isInteractive?: boolean
  showLastWornAt?: boolean
  freshness?: number
  onItemUpdate?: (itemId: string, updates: { name?: string; brand?: string; type?: string }) => Promise<boolean | void>
  onArchiveToggle?: (itemId: string, isArchived: boolean) => Promise<boolean | void>
  isSelected?: boolean
  onSelect?: (itemId: string, multiSelect: boolean) => void
}

export function Item({ 
  item, 
  itemType, 
  isCoreItem = false, 
  isInteractive = false, 
  showLastWornAt = false, 
  freshness,
  onItemUpdate,
  onArchiveToggle,
  isSelected = false,
  onSelect
}: ItemProps) {
  const Icon = itemTypeIcons[itemType]
  const [name, setName] = useState(item.name)
  const [brand, setBrand] = useState(item.brand || '')
  const [type, setType] = useState<keyof typeof itemTypeIcons>(item.type as keyof typeof itemTypeIcons || itemType)
  const [expanded, setExpanded] = useState(false)

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clickCountRef = useRef(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const expandedItemRef = useRef<HTMLDivElement>(null)
  const regularViewRef = useRef<HTMLDivElement>(null)
  const { expandedItemId, toggleExpandedItem, closeExpandedItem } = useItemExpand()
  
  // Determine if this item is expanded
  const isExpanded = expandedItemId === item.id

  // Format freshness score as percentage
  const freshnessDisplay = freshness !== undefined ? `${Math.round(freshness * 100)}%` : null

  // Reset state when item changes
  useEffect(() => {
    setName(item.name)
    setBrand(item.brand || '')
    setType(item.type as keyof typeof itemTypeIcons || itemType)
  }, [item, itemType])

  // Sync expanded state with context
  useEffect(() => {
    setExpanded(isExpanded)
  }, [isExpanded])

  // Auto-save when fields change
  useEffect(() => {
    if (!expanded || !onItemUpdate) return;
    
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Set a new timeout to save after user stops typing
    saveTimeoutRef.current = setTimeout(async () => {
      await saveItemData();
    }, 500) // Debounce for 500ms
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [name, brand, expanded, item.id, onItemUpdate, type]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  // Handle click outside to close expanded item
  useEffect(() => {
    if (!expanded) return;

    async function handleClickOutside(event: MouseEvent) {
      if (expandedItemRef.current && !expandedItemRef.current.contains(event.target as Node)) {
        await handleCloseExpanded();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded]);

  // Save data on unmount if expanded
  useEffect(() => {
    return () => {
      if (expanded && onItemUpdate) {
        // Use a synchronous approach for unmounting
        saveItemData();
      }
    }
  }, [expanded, name, brand, type, onItemUpdate, item.id]);

  // Extract save logic to a reusable function
  const saveItemData = async () => {
    if (!onItemUpdate) return;
    
    try {
      console.log('Saving item data:', { id: item.id, name, brand, type });
      const result = await onItemUpdate(item.id, { 
        name, 
        brand: brand || undefined,
        type
      });
      console.log('Save result:', result);
      return result;
    } catch (error) {
      console.error('Error saving item data:', error);
      return false;
    }
  };

  const handleCloseExpanded = async () => {
    // Save data before closing
    if (expanded) {
      await saveItemData();
    }
    closeExpandedItem();
  };

  const handleItemClick = (e: React.MouseEvent) => {
    if (!isInteractive) return;

    // Handle selection if the onSelect prop is provided
    if (onSelect) {
      // Detect command/ctrl key for multi-select
      const isMultiSelect = e.metaKey || e.ctrlKey;
      onSelect(item.id, isMultiSelect);
      return;
    }

    // Use separate behavior based on screen size
    const isMobileView = window.innerWidth < 768;
    
    if (isMobileView) {
      // On mobile, expand on single click
      if (expanded) {
        handleCloseExpanded();
      } else {
        toggleExpandedItem(item.id);
      }
    } else {
      // On desktop, implement single/double click behavior
      clickCountRef.current += 1
      
      if (clickCountRef.current === 1) {
        // Reset click count after 300ms unless another click occurs
        clickTimeoutRef.current = setTimeout(() => {
          clickCountRef.current = 0
        }, 300)
      } else if (clickCountRef.current === 2) {
        // Double click - expand
        clearTimeout(clickTimeoutRef.current as NodeJS.Timeout)
        clickTimeoutRef.current = null
        clickCountRef.current = 0
        
        if (expanded) {
          handleCloseExpanded();
        } else {
          toggleExpandedItem(item.id);
        }
      }
    }
  }

  const handleArchive = async () => {
    if (onArchiveToggle) {
      await onArchiveToggle(item.id, !item.isArchived)
    }
    await handleCloseExpanded();
  }

  const handleTypeChange = async (newType: keyof typeof itemTypeIcons) => {
    // Update local state immediately for responsive UI
    setType(newType);
    
    // Save the change to the API if a handler is provided
    if (onItemUpdate) {
      try {
        await onItemUpdate(item.id, { 
          name, 
          brand: brand || undefined,
          type: newType
        });
        // If we got here, the update succeeded
      } catch (error) {
        // If the API call fails, revert to the original type
        console.error('Failed to update item type:', error);
        setType(item.type as keyof typeof itemTypeIcons || itemType);
      }
    }
  }

  // Render the item icon - used in both states for consistency
  const renderItemIcon = () => (
    <div className={cn("flex-shrink-0 p-[4px] rounded mt-0.5 border-2", 
      item.isArchived 
        ? "text-muted-foreground bg-background border-muted-foreground" 
        : "text-background bg-muted-foreground border-muted-foreground")}>
      {React.createElement(itemTypeIcons[type], { className: "h-[17.5px] w-[17.5px]" })}
    </div>
  );

  return (
    <div className="mb-1">
      {/* Regular item view */}
      {!expanded && (
        <div 
          ref={regularViewRef}
          className={cn(
            "flex items-start space-x-3 min-w-0 max-w-full",
            isInteractive && "cursor-pointer",
            isSelected && "md:bg-accent/20 md:p-2 md:-m-2 md:rounded-md",
          )}
          onClick={handleItemClick}
        >
          {renderItemIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col justify-start">
              <p className="font-medium leading-[18px]">
                {item.name}
                {isCoreItem && <span className="ml-1 text-xs align-top">•</span>}
              </p>
              <p className="text-xs text-muted-foreground -mt-[0.05rem]">
                {item.isArchived ? <i>Archived</i> : item.brand || <i>Unbranded</i>}
                {showLastWornAt && (
                  <span>
                    <span className="text-xs align-top ml-[5px] mr-[6px]">•</span>
                    {item.lastWornAt ? (
                      <>
                        Worn {DateTime.fromISO(item.lastWornAt).toRelativeCalendar({
                          locale: 'en-US',
                          unit: 'days'
                        })} 
                      </>
                    ) : (
                      <i>Never worn!</i>
                    )}
                  </span>
                )}
                {freshnessDisplay && (
                  <span>
                    <span className="text-xs align-top ml-[5px] mr-[6px]">•</span>
                    F: {freshnessDisplay}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded item view */}
      {expanded && (
        <div 
          ref={expandedItemRef}
          className="bg-card rounded-md shadow-sm p-4 -mx-4 animate-in slide-in-from-top-2 duration-150"
        >
          <div className="space-y-3">
            <div className="flex items-start">
              {renderItemIcon()}
              <div className="flex-1 ml-3 space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                  placeholder="Item name"
                />
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Brand (optional)"
                  className="w-full"
                />
                {item.lastWornAt && (
                  <p className="text-xs text-muted-foreground">
                    Worn {DateTime.fromISO(item.lastWornAt).toRelativeCalendar({
                      locale: 'en-US',
                      unit: 'days'
                    })}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-between mt-2">
              <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
                {Object.entries(itemTypeIcons).map(([key, TypeIcon]) => (
                  <Button 
                    key={key}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "p-1",
                      type === key ? "opacity-100" : "opacity-70"
                    )}
                    onClick={() => handleTypeChange(key as keyof typeof itemTypeIcons)}
                  >
                    <div className={cn("flex-shrink-0 p-[4px] rounded border-[1.25px]", 
                      item.isArchived 
                        ? "text-muted-foreground bg-background border-muted-foreground" 
                        : type === key 
                          ? "text-background bg-muted-foreground border-muted-foreground"
                          : "text-muted-foreground bg-background border-muted-foreground border-dashed"
                    )}>
                      <TypeIcon className="h-[17.5px] w-[17.5px]" />
                    </div>
                  </Button>
                ))}
              </div>
              <Button 
                size="sm"
                variant="ghost" 
                onClick={handleArchive}
                className="p-1 ml-2 flex-shrink-0"
              >
                <div className={cn("flex-shrink-0 p-[4px] rounded border-[1.25px]", 
                  item.isArchived 
                    ? "text-background bg-muted-foreground border-muted-foreground" 
                    : "text-muted-foreground bg-background border-muted-foreground border-dashed"
                )}>
                  {item.isArchived ? <X className="h-[17.5px] w-[17.5px]" /> : <Archive className="h-[17.5px] w-[17.5px]" />}
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

