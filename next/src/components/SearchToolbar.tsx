'use client'

import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { ItemInlineSearch } from './ItemInlineSearch'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

interface SearchToolbarProps {
  // Search props
  searchValue?: string
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearchClick?: () => void
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  searchAddMode?: boolean
  onSearchNewItem?: (itemId: string, itemType: string) => void
}

/**
 * Search toolbar with the same styling as the original SelectionToolbar
 * but only contains search functionality.
 */
export function SearchToolbar({ 
  searchValue,
  onSearchChange,
  onSearchClick,
  onSearchKeyDown,
  searchAddMode,
  onSearchNewItem
}: SearchToolbarProps) {
  const router = useRouter()
  // Check if search functionality is enabled
  const hasSearchFunctionality = searchValue !== undefined && 
    onSearchChange && 
    onSearchKeyDown && 
    searchAddMode !== undefined && 
    onSearchNewItem

  const handleAgentSubmit = () => {
    if (searchValue && searchValue.trim()) {
      router.push(`/agent?q=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  if (!hasSearchFunctionality) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md sm:max-w-lg px-4 sm:px-0">
      <div className="bg-background/80 backdrop-blur-sm border-2 rounded-lg shadow-lg p-2 flex items-center gap-2 w-full">
        <div className="flex-1 min-w-0 ml-1">
          <ItemInlineSearch
            value={searchValue}
            onChange={onSearchChange}
            onClick={onSearchClick || (() => {})}
            onKeyDown={onSearchKeyDown}
            addMode={searchAddMode}
            onNewItem={onSearchNewItem}
          />
        </div>
        
        {/* Agent submission button */}
        {searchValue && searchValue.trim() && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAgentSubmit}
                  className="shrink-0 p-2 h-8 w-8"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ask Fashion Assistant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
