'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, Send } from 'lucide-react'
import { ItemInlineSearch } from './ItemInlineSearch'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

interface SearchToolbarProps {
  // Search props (for items/outfits pages)
  searchValue?: string
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearchClick?: () => void
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  searchAddMode?: boolean
  onSearchNewItem?: (itemId: string, itemType: string) => void
  
  // Agent mode props
  agentMode?: boolean
  onAgentSubmit?: (message: string) => void
  agentDisabled?: boolean
  agentPlaceholder?: string
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
  onSearchNewItem,
  agentMode = false,
  onAgentSubmit,
  agentDisabled = false,
  agentPlaceholder = "Ask about your wardrobe..."
}: SearchToolbarProps) {
  const router = useRouter()
  
  // Check if search functionality is enabled (for items/outfits pages)
  const hasSearchFunctionality = searchValue !== undefined && 
    onSearchChange && 
    onSearchKeyDown && 
    searchAddMode !== undefined && 
    onSearchNewItem

  // Agent mode should always render if enabled
  if (!agentMode && !hasSearchFunctionality) {
    return null
  }

  const handleAgentSubmit = () => {
    if (searchValue && searchValue.trim()) {
      if (agentMode && onAgentSubmit) {
        // Direct agent submission
        onAgentSubmit(searchValue.trim())
      } else {
        // Clear any existing conversation context before navigating to agent page
        localStorage.removeItem('agentConversationId')
        // Navigate to agent page
        router.push(`/agent?q=${encodeURIComponent(searchValue.trim())}`)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (agentMode) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleAgentSubmit()
      }
    } else if (onSearchKeyDown) {
      onSearchKeyDown(e)
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md sm:max-w-lg px-4 sm:px-0">
      <div className="bg-background/80 backdrop-blur-sm border-2 rounded-lg shadow-lg p-2 flex items-center gap-2 w-full">
        <div className="flex-1 min-w-0 ml-1">
          <ItemInlineSearch
            value={searchValue || ''}
            onChange={onSearchChange || (() => {})}
            onClick={onSearchClick || (() => {})}
            onKeyDown={handleKeyDown}
            addMode={agentMode ? false : searchAddMode}
            onNewItem={agentMode ? (() => {}) : onSearchNewItem}
            placeholder={agentMode ? agentPlaceholder : undefined}
            disabled={agentMode ? agentDisabled : false}
          />
        </div>
        
        {/* Submit button */}
        {searchValue && searchValue.trim() && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAgentSubmit}
                  disabled={agentMode && agentDisabled}
                  className="shrink-0 p-2 h-8 w-8"
                >
                  {agentMode ? (
                    <Send className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{agentMode ? 'Send Message' : 'Ask Fashion Assistant'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
