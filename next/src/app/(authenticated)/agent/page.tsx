'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { useItems, useOutfits } from '@/lib/client'
import { Item } from '@/components/Item'
import OutfitCard from '@/components/OutfitCard'
import SuggestedOutfitCard from '@/components/SuggestedOutfitCard'
import { OutfitCardLoading } from '@/components/OutfitCardLoading'
import { ItemLoading } from '@/components/ItemLoading'
import { Shimmer } from '@/components/ui/shimmer'
import { SearchToolbar } from '@/components/SearchToolbar'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type StreamingStatus = 'ready' | 'streaming' | 'error'

export default function AgentPage() {
  const { getToken } = useAuth()
  const { items } = useItems()
  const { outfits, getOutfitById } = useOutfits()
  const searchParams = useSearchParams()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<StreamingStatus>('ready')
  const [error, setError] = useState<string | null>(null)
  const [fetchedOutfits, setFetchedOutfits] = useState<Record<string, any>>({})

  // Clear any existing conversation context on page load
  useEffect(() => {
    // Always start fresh - clear any stored conversation ID
    localStorage.removeItem('agentConversationId')
    setConversationId(undefined)
    setMessages([])
    setCurrentStatus(null)
    setError(null)
    setStatus('ready')
  }, [])

  const sendMessage = useCallback(async (messageText: string, retryCount = 0) => {
    if (status !== 'ready' || !messageText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setStatus('streaming')
    setError(null)
    setCurrentStatus('Connecting...')

    const maxRetries = 2
    const retryDelay = 1000 * Math.pow(2, retryCount) // Exponential backoff

    try {
      const token = await getToken()
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/agent`
      
      // Send the message via POST first
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText,
          conversationId,
        }),
      })

      if (!response.ok) {
        if (response.status >= 500 && retryCount < maxRetries) {
          // Server error - retry with exponential backoff
          setCurrentStatus(`Connection failed, retrying in ${retryDelay / 1000}s...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return sendMessage(messageText, retryCount + 1)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Create assistant message for streaming (will be added when first content arrives)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }

      let assistantMessageAdded = false

      // Handle SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      let streamEnded = false

      while (!streamEnded) {
        const { done, value } = await reader.read()
        
        if (done) {
          streamEnded = true
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim()
            if (eventType === 'end') {
              streamEnded = true
            } else if (eventType === 'error') {
              throw new Error('Server reported an error')
            }
            continue
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (!data || data === '{}') continue

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.textDelta && parsed.textDelta.trim()) {
                if (!assistantMessageAdded) {
                  // Add the assistant message when first content arrives
                  setMessages(prev => [...prev, { ...assistantMessage, content: parsed.textDelta }])
                  assistantMessageAdded = true
                } else {
                  // Update existing assistant message
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: msg.content + parsed.textDelta }
                      : msg
                  ))
                }
              } else if (parsed.status) {
                console.log('Status update received:', parsed.status)
                setCurrentStatus(parsed.status)
              } else if (parsed.conversationId) {
                setConversationId(parsed.conversationId)
                localStorage.setItem('agentConversationId', parsed.conversationId)
              } else if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', data, parseError)
            }
          }
        }
      }

      setStatus('ready')
      setCurrentStatus(null)
      
      // Log completed message to console and check for failed lookups
      console.log('Message completed:', {
        id: assistantMessage.id,
        timestamp: new Date().toISOString()
      })
      
      // Check for failed outfit/item lookups after message completion
      setTimeout(() => {
        // Get the final content from the current messages state
        setMessages(currentMessages => {
          const completedMessage = currentMessages.find(msg => msg.id === assistantMessage.id)
          if (completedMessage) {
            checkForFailedLookups(completedMessage.content)
          }
          return currentMessages
        })
      }, 100)
    } catch (err) {
      console.error('Streaming error:', err)
      
      // Network errors - retry with exponential backoff
      if ((err instanceof TypeError && err.message.includes('fetch')) && retryCount < maxRetries) {
        setCurrentStatus(`Network error, retrying in ${retryDelay / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return sendMessage(messageText, retryCount + 1)
      }
      
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStatus('error')
      setCurrentStatus(null)
    }
  }, [getToken, conversationId, status])

  // Handle initial query from URL
  useEffect(() => {
    const initialQuery = searchParams.get('q')
    if (initialQuery && status === 'ready' && messages.length === 0) {
      setInput(initialQuery)
      // Auto-submit the query after a brief delay to ensure everything is loaded
      setTimeout(() => {
        sendMessage(initialQuery)
      }, 100)
    }
  }, [searchParams, status, sendMessage, messages.length])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAgentSubmit = (message: string) => {
    sendMessage(message)
    setInput('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleNewConversation = () => {
    // Clear all conversation context and state
    setConversationId(undefined)
    localStorage.removeItem('agentConversationId')
    setMessages([])
    setCurrentStatus(null)
    setError(null)
    setStatus('ready')
    setFetchedOutfits({})
    console.log('Started new conversation - all context cleared')
  }

  const fetchOutfitById = async (outfitId: string) => {
    if (fetchedOutfits[outfitId]) {
      return fetchedOutfits[outfitId]
    }
    
    try {
      const outfit = await getOutfitById(outfitId)
      if (outfit) {
        setFetchedOutfits(prev => ({ ...prev, [outfitId]: outfit }))
        return outfit
      }
    } catch (error) {
      console.error('Error fetching outfit:', error)
    }
    return null
  }

  // Check for failed outfit/item lookups and log raw tags
  const checkForFailedLookups = (content: string) => {
    const tagMatches = content.match(/<(outfit_existing|outfit_suggested|item)\s+[^>]+\/>/g) || []
    
    tagMatches.forEach((tag) => {
      const tagMatch = tag.match(/<(outfit_existing|outfit_suggested|item)\s+([^>]+)\/>/)
      if (!tagMatch) return
      
      const [, tagType, attributes] = tagMatch
      
      if (tagType === 'outfit_existing') {
        const idMatch = attributes.match(/id="([^"]+)"/)
        if (idMatch) {
          const outfitId = idMatch[1]
          const outfit = outfits?.find(o => o.id === outfitId)
          if (!outfit) {
            console.warn('Failed outfit lookup - Raw tag:', tag)
            console.warn('Failed outfit lookup - ID:', outfitId)
            console.warn('Available outfit IDs:', outfits?.map(o => o.id) || [])
            console.warn('Total outfits loaded:', outfits?.length || 0)
          }
        }
      }
      
      if (tagType === 'item') {
        const idMatch = attributes.match(/id="([^"]+)"/)
        if (idMatch) {
          const itemId = idMatch[1]
          const item = items?.find(i => i.id === itemId)
          if (!item) {
            console.warn('Failed item lookup - Raw tag:', tag)
            console.warn('Failed item lookup - ID:', itemId)
            console.warn('Available item IDs:', items?.map(i => i.id) || [])
            console.warn('Total items loaded:', items?.length || 0)
          }
        }
      }
    })
  }

  // Simple markdown renderer for basic formatting
  const renderMarkdown = (text: string) => {
    // Handle bold text
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Handle italic text
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Handle inline code
    text = text.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    
    return text
  }

  // Parse and render text with MDX tags and markdown
  const renderMessage = (text: string) => {
    const parts = text.split(/(<(?:outfit_existing|outfit_suggested|item)\s+[^>]+\/>)/g)
    
    return parts.map((part, index) => {
      const tagMatch = part.match(/<(outfit_existing|outfit_suggested|item)\s+([^>]+)\/>/)
      
      if (tagMatch) {
        const [, tagType, attributes] = tagMatch
        
        if (tagType === 'outfit_existing') {
          const idMatch = attributes.match(/id="([^"]+)"/)
          if (idMatch) {
            const outfitId = idMatch[1]
            const outfit = outfits?.find(o => o.id === outfitId) || fetchedOutfits[outfitId]
            if (outfit) {
              return (
                <div key={index} data-kind="outfit">
                  <OutfitCard
                    outfitItems={outfit.outfitItems || []}
                    tags={outfit.outfitTags?.map((tag: any) => ({ tagId: tag.tagId })) || []}
                    wearDate={outfit.wearDate}
                    rating={outfit.rating}
                    locationLatitude={outfit.locationLatitude}
                    locationLongitude={outfit.locationLongitude}
                    index={index}
                    showThreeDotsMenu={false}
                  />
                </div>
              )
            } else {
              // Try to fetch the outfit if not found locally
              fetchOutfitById(outfitId)
              return (
                <div key={index} data-kind="outfit">
                  <OutfitCardLoading />
                </div>
              )
            }
          }
        }
        
        if (tagType === 'outfit_suggested') {
          const itemsMatch = attributes.match(/items='([^']+)'/)
          if (itemsMatch) {
            try {
              const items = JSON.parse(itemsMatch[1])
              return (
                <div key={index} data-kind="outfit">
                  <SuggestedOutfitCard items={items} />
                </div>
              )
            } catch (e) {
              console.error('Failed to parse outfit items:', e)
            }
          }
        }
        
        if (tagType === 'item') {
          const idMatch = attributes.match(/id="([^"]+)"/)
          if (idMatch) {
            const itemId = idMatch[1]
            const item = items?.find(i => i.id === itemId)
            if (item) {
              return (
                <div key={index} data-kind="item">
                  <Item item={item} showThreeDotsMenu={false} />
                </div>
              )
            } else {
              return (
                <div key={index} data-kind="item">
                  <ItemLoading />
                </div>
              )
            }
          }
        }
      }
      
      // Regular text with markdown rendering
      if (!part.trim()) return null
      
      const lines = part.split('\n')
      return (
        <span key={index} className="whitespace-pre-wrap leading-relaxed" data-kind="text">
          {lines.map((line, lineIndex) => (
            <span key={lineIndex} dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }} />
          ))}
        </span>
      )
    })
  }

  return (
    <div className="space-y-6">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div key={message.id} className="fade-in">
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] ${
                  message.role === 'user'
                    && 'bg-secondary text-secondary-foreground rounded-xl'
                }`}
              >
                <div className="py-3 px-4">
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </p>
                  ) : (
                      <div className="text-sm
                    [&>*]:block
    space-y-4
    [&>[data-kind=item]+[data-kind=item]]:!mt-1">
                      {renderMessage(message.content)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Loading State */}
        {status === 'streaming' && currentStatus && (
          <div className="flex justify-start fade-in">
            <div className="max-w-[85%] py-2 px-4">
              <Shimmer 
                className="text-sm" 
              >
                {currentStatus}
              </Shimmer>
            </div>
          </div>
        )}
        
        {/* Skeleton fallback when no status */}
        {status === 'streaming' && !currentStatus && (
          <div className="flex justify-start fade-in">
            <div className="max-w-[85%] py-2 px-4">
              <Shimmer 
                className="text-sm" 
              >
                Thinking...
              </Shimmer>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && error && (
          <div className="flex justify-center">
            <Card className="max-w-[85%] border-destructive bg-destructive/5">
              <CardContent className="p-4">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Search Toolbar for Agent Input */}
      <SearchToolbar
        agentMode={true}
        searchValue={input}
        onSearchChange={handleInputChange}
        onAgentSubmit={handleAgentSubmit}
        agentDisabled={status !== 'ready'}
        agentPlaceholder="Ask about your wardrobe..."
      />
    </div>
  )
}