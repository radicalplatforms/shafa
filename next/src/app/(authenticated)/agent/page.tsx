'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { type UIMessage } from 'ai'
import { Card, CardContent } from '@/components/ui/card'
import { useItems, useOutfits } from '@/lib/client'
import { Item } from '@/components/Item'
import OutfitCard from '@/components/OutfitCard'
import SuggestedOutfitCard from '@/components/SuggestedOutfitCard'
import { OutfitCardLoading } from '@/components/OutfitCardLoading'
import { ItemLoading } from '@/components/ItemLoading'
import { Shimmer } from '@/components/ui/shimmer'
import { SearchToolbar } from '@/components/SearchToolbar'
import { AlertCircle } from 'lucide-react'

type StreamingStatus = 'ready' | 'streaming' | 'error'

function OutfitCardError({ outfitId }: { outfitId: string }) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Outfit not found</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          The outfit with ID {outfitId.slice(0, 8)}... could not be found.
        </p>
      </CardContent>
    </Card>
  )
}

function ItemError({ itemId }: { itemId: string }) {
  return (
    <div className="flex items-start space-x-3 min-w-0 max-w-full p-2 border border-destructive/50 rounded bg-destructive/5">
      <div className="flex-shrink-0 p-[4px] rounded mt-0.5 border-2 border-destructive/50">
        <AlertCircle className="h-[17.5px] w-[17.5px] text-destructive" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col justify-start mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-destructive">Item not found</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            The item with ID {itemId.slice(0, 8)}... could not be found.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AgentPage() {
  const { getToken } = useAuth()
  const { items, isLoading: itemsLoading } = useItems()
  const { outfits, getOutfitById } = useOutfits()
  const searchParams = useSearchParams()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [status, setStatus] = useState<StreamingStatus>('ready')
  const [error, setError] = useState<string | null>(null)
  const [fetchedOutfits, setFetchedOutfits] = useState<Record<string, any>>({})
  const [erroredOutfits, setErroredOutfits] = useState<Set<string>>(new Set())
  const [erroredItems, setErroredItems] = useState<Set<string>>(new Set())

  // Clear any existing conversation context on page load
  useEffect(() => {
    // Always start fresh - clear any stored conversation ID
    localStorage.removeItem('agentConversationId')
    setConversationId(undefined)
    setMessages([])
    setCurrentStatus(null)
    setError(null)
    setStatus('ready')
    setErroredOutfits(new Set())
    setErroredItems(new Set())
  }, [])

  const sendMessage = useCallback(async (messageText: string, retryCount = 0) => {
    if (status !== 'ready' || !messageText.trim()) return

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      parts: [{ type: 'text', text: messageText.trim() }],
    }

    setMessages(prev => [...prev, userMessage])
    setStatus('streaming')
    setError(null)
    setCurrentStatus('Connecting...')

    const maxRetries = 2
    const retryDelay = 1000 * Math.pow(2, retryCount)

    try {
      const token = await getToken()
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/agent/messages`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: conversationId,
          text: messageText.trim(),
        }),
      })

      if (!response.ok) {
        if (response.status >= 500 && retryCount < maxRetries) {
          setCurrentStatus(`Connection failed, retrying in ${retryDelay / 1000}s...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return sendMessage(messageText, retryCount + 1)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const assistantMessageId = (Date.now() + 1).toString()
      let currentEventType: string | null = null

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      let streamEnded = false

      const updateAssistantMessage = (updater: (msg: UIMessage) => UIMessage) => {
        setMessages(prev => {
          const index = prev.findIndex(msg => msg.id === assistantMessageId)
          if (index === -1) {
            const newMsg = updater({
              id: assistantMessageId,
              role: 'assistant',
              parts: [],
            })
            return [...prev, newMsg]
          }
          const updated = prev.map((msg, i) => 
            i === index ? updater(msg) : msg
          )
          return updated
        })
      }

      while (!streamEnded) {
        const { done, value } = await reader.read()
        
        if (done) {
          streamEnded = true
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim()
            if (currentEventType === 'end') {
              streamEnded = true
            }
            continue
          }
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (!data || data === '{}') continue

            try {
              const parsed = JSON.parse(data)
              
              if (currentEventType === 'error' && parsed.error) {
                throw new Error(parsed.error)
              }
              
              if (currentEventType === 'text-delta' && parsed.textDelta) {
                updateAssistantMessage(msg => {
                  const parts = [...(msg.parts || [])]
                  const lastPart = parts[parts.length - 1]
                  if (lastPart && lastPart.type === 'text' && lastPart.state === 'streaming') {
                    parts[parts.length - 1] = {
                      ...lastPart,
                      text: (lastPart as any).text + parsed.textDelta,
                    }
                  } else {
                    parts.push({
                      type: 'text',
                      text: parsed.textDelta,
                      state: 'streaming',
                    })
                  }
                  return { ...msg, parts }
                })
              } else if (currentEventType === 'reasoning-delta' && parsed.reasoningDelta) {
                updateAssistantMessage(msg => {
                  const parts = [...(msg.parts || [])]
                  const lastPart = parts[parts.length - 1]
                  if (lastPart && lastPart.type === 'reasoning' && lastPart.state === 'streaming') {
                    parts[parts.length - 1] = {
                      ...lastPart,
                      text: (lastPart as any).text + parsed.reasoningDelta,
                    }
                  } else {
                    parts.push({
                      type: 'reasoning',
                      text: parsed.reasoningDelta,
                      state: 'streaming',
                    })
                  }
                  return { ...msg, parts }
                })
              } else if (currentEventType === 'tool-call' && parsed.toolCall) {
                updateAssistantMessage(msg => {
                  const parts = [...(msg.parts || [])]
                  const toolCallId = parsed.toolCall.toolCallId
                  const existingIndex = parts.findIndex(
                    p => (p as any).toolCallId === toolCallId
                  )
                  if (existingIndex >= 0) {
                    parts[existingIndex] = parsed.toolCall
                  } else {
                    parts.push(parsed.toolCall)
                  }
                  return { ...msg, parts }
                })
              } else if (currentEventType === 'data-part' && parsed.dataPart) {
                updateAssistantMessage(msg => {
                  const parts = [...(msg.parts || [])]
                  parts.push(parsed.dataPart)
                  return { ...msg, parts }
                })
              } else if (currentEventType === 'step-start' && parsed.stepStart) {
                updateAssistantMessage(msg => {
                  const parts = [...(msg.parts || [])]
                  parts.push(parsed.stepStart)
                  return { ...msg, parts }
                })
              } else if (currentEventType === 'status' && parsed.status) {
                setCurrentStatus(parsed.status)
              } else if (currentEventType === 'metadata' && parsed.conversationId) {
                setConversationId(parsed.conversationId)
                localStorage.setItem('agentConversationId', parsed.conversationId)
              } else if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                console.warn('Failed to parse SSE data:', data, parseError)
              } else {
                throw parseError
              }
            }
          }
        }
      }

      // Mark all streaming parts as done
      updateAssistantMessage(msg => ({
        ...msg,
        parts: (msg.parts || []).map(part => {
          if (part.type === 'text' && (part as any).state === 'streaming') {
            return { ...part, state: 'done' }
          }
          if (part.type === 'reasoning' && (part as any).state === 'streaming') {
            return { ...part, state: 'done' }
          }
          return part
        }),
      }))

      setStatus('ready')
      setCurrentStatus(null)
    } catch (err) {
      console.error('Streaming error:', err)
      
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
        sendMessage(initialQuery).catch((err) => {
          console.error('Error sending initial message:', err)
        })
      }, 100)
    }
  }, [searchParams, status, sendMessage, messages.length])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check for missing items after items finish loading
  useEffect(() => {
    if (!itemsLoading && items && items.length > 0) {
      const itemsArray = Array.isArray(items) ? items : (items as any)?.data || []
      const itemIds = new Set(itemsArray.map((i: any) => i.id))
      
      // Find all item IDs referenced in messages that aren't in the items list
      const missingItemIds = new Set<string>()
      messages.forEach(msg => {
        if (msg.parts) {
          msg.parts.forEach(part => {
            if (part.type === 'text') {
              const text = (part as any).text || ''
              const itemMatches = text.matchAll(/<item\s+id="([^"]+)"\s*\/>/g)
              for (const match of itemMatches) {
                const itemId = match[1]
                if (!itemIds.has(itemId) && !erroredItems.has(itemId)) {
                  missingItemIds.add(itemId)
                }
              }
            } else if (part.type === 'data-item') {
              const itemId = (part as any).data?.id || (part as any).id
              if (itemId && !itemIds.has(itemId) && !erroredItems.has(itemId)) {
                missingItemIds.add(itemId)
              }
            }
          })
        }
      })
      
      if (missingItemIds.size > 0) {
        setErroredItems(prev => {
          const next = new Set(prev)
          missingItemIds.forEach(id => next.add(id))
          return next
        })
      }
    }
  }, [items, itemsLoading, messages, erroredItems])

  const handleAgentSubmit = (message: string) => {
    sendMessage(message).catch((err) => {
      console.error('Error sending message:', err)
    })
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
    setErroredOutfits(new Set())
    setErroredItems(new Set())
    console.log('Started new conversation - all context cleared')
  }

  const fetchOutfitById = async (outfitId: string) => {
    if (fetchedOutfits[outfitId]) {
      return fetchedOutfits[outfitId]
    }
    
    if (erroredOutfits.has(outfitId)) {
      return null
    }
    
    try {
      const token = await getToken()
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/outfits/${outfitId}`
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.status === 404) {
        setErroredOutfits(prev => new Set(prev).add(outfitId))
        return null
      }
      
      if (response.ok) {
        const outfit = await response.json()
        setFetchedOutfits(prev => ({ ...prev, [outfitId]: outfit }))
        return outfit
      }
    } catch (error) {
      console.error('Error fetching outfit:', error)
    }
    return null
  }

  const renderMarkdown = (text: string) => {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
    text = text.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    return text
  }

  const renderOutfitExisting = (outfitId: string, key: string | number) => {
    const outfit = outfits?.find(o => o.id === outfitId) || fetchedOutfits[outfitId]
    if (outfit) {
      return (
        <div key={key} data-kind="outfit">
          <OutfitCard
            outfitItems={outfit.outfitItems || []}
            tags={outfit.outfitTags?.map((tag: any) => ({ tagId: tag.tagId })) || []}
            wearDate={outfit.wearDate}
            rating={outfit.rating}
            locationLatitude={outfit.locationLatitude}
            locationLongitude={outfit.locationLongitude}
            index={typeof key === 'number' ? key : 0}
            showThreeDotsMenu={false}
          />
        </div>
      )
    }
    
    if (erroredOutfits.has(outfitId)) {
      return (
        <div key={key} data-kind="outfit">
          <OutfitCardError outfitId={outfitId} />
        </div>
      )
    }
    
    fetchOutfitById(outfitId)
    return (
      <div key={key} data-kind="outfit">
        <OutfitCardLoading />
      </div>
    )
  }

  const renderOutfitSuggested = (itemsData: any, key: string | number) => {
    const itemsArray = Array.isArray(itemsData) ? itemsData : itemsData?.items || itemsData
    if (itemsArray && itemsArray.length > 0) {
      return (
        <div key={key} data-kind="outfit">
          <SuggestedOutfitCard items={itemsArray} />
        </div>
      )
    }
    return null
  }

  const renderItem = (itemId: string, key: string | number) => {
    const itemsArray = Array.isArray(items) ? items : (items as any)?.data || []
    const item = itemsArray.find((i: any) => i.id === itemId)
    if (item) {
      return (
        <div key={key} data-kind="item">
          <Item item={item} showThreeDotsMenu={false} />
        </div>
      )
    }
    
    if (erroredItems.has(itemId)) {
      return (
        <div key={key} data-kind="item">
          <ItemError itemId={itemId} />
        </div>
      )
    }
    
    return (
      <div key={key} data-kind="item">
        <ItemLoading />
      </div>
    )
  }

  const parseMDXTag = (tagText: string): { type: string; id?: string; items?: any } | null => {
    const tagMatch = tagText.match(/<(outfit_existing|outfit_suggested|item)\s+([^>]+)\/>/)
    if (!tagMatch) return null

    const [, tagType, attributes] = tagMatch

    if (tagType === 'outfit_existing' || tagType === 'item') {
      const idMatch = attributes.match(/id="([^"]+)"/)
      if (idMatch) {
        return { type: tagType, id: idMatch[1] }
      }
    }

    if (tagType === 'outfit_suggested') {
      const itemsMatch = attributes.match(/items='([^']+)'/)
      if (itemsMatch) {
        try {
          const items = JSON.parse(itemsMatch[1])
          return { type: tagType, items }
        } catch (e) {
          console.error('Failed to parse outfit items:', e)
        }
      }
    }

    return null
  }

  const renderTextPart = (part: any, index: number) => {
    const text = part.text || ''
    if (!text.trim()) return null
    
    const segments = text.split(/(<(?:outfit_existing|outfit_suggested|item)\s+[^>]+\/>)/g)
    
    return (
      <>
        {segments.map((segment: string, segmentIndex: number) => {
          const mdxTag = parseMDXTag(segment)
          
          if (mdxTag) {
            if (mdxTag.type === 'outfit_existing' && mdxTag.id) {
              return renderOutfitExisting(mdxTag.id, `${index}-${segmentIndex}`)
            }
            if (mdxTag.type === 'outfit_suggested' && mdxTag.items) {
              return renderOutfitSuggested(mdxTag.items, `${index}-${segmentIndex}`)
            }
            if (mdxTag.type === 'item' && mdxTag.id) {
              return renderItem(mdxTag.id, `${index}-${segmentIndex}`)
            }
          }
          
          if (!segment.trim()) return null
          
          const lines = segment.split('\n')
          return (
            <span key={`${index}-${segmentIndex}`} className="whitespace-pre-wrap leading-relaxed block" data-kind="text">
              {lines.map((line: string, lineIndex: number) => (
                <span key={lineIndex} dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }} />
              ))}
            </span>
          )
        })}
      </>
    )
  }

  const renderDataPart = (part: any, index: number) => {
    if (part.type === 'data-outfit_existing') {
      const outfitId = part.data?.id || part.id
      if (outfitId) {
        return renderOutfitExisting(outfitId, index)
      }
    }
    
    if (part.type === 'data-outfit_suggested') {
      const itemsData = part.data?.items || part.data
      if (itemsData) {
        return renderOutfitSuggested(itemsData, index)
      }
    }
    
    if (part.type === 'data-item') {
      const itemId = part.data?.id || part.id
      if (itemId) {
        return renderItem(itemId, index)
      }
    }
    
    return (
      <div key={index} className="text-xs text-muted-foreground">
        {part.type}: {JSON.stringify(part.data)}
      </div>
    )
  }

  const renderMessageParts = (message: UIMessage) => {
    if (!message.parts || message.parts.length === 0) return null
    
    return message.parts.map((part, index) => {
      if (part.type === 'text') {
        return renderTextPart(part, index)
      }
      
      if (part.type === 'reasoning') {
        return (
          <div key={index} className="text-xs text-muted-foreground italic">
            Reasoning: {(part as any).text}
          </div>
        )
      }
      
      if (part.type === 'tool-input-error') {
        const errorPart = part as any
        return (
          <div key={index} className="text-xs text-muted-foreground">
            Tool: {errorPart.toolName} (input error)
            <div className="text-destructive mt-1">Error: {errorPart.errorText}</div>
          </div>
        )
      }
      
      if (part.type === 'tool-output-error') {
        const errorPart = part as any
        return (
          <div key={index} className="text-xs text-muted-foreground">
            Tool (output error)
            <div className="text-destructive mt-1">Error: {errorPart.errorText}</div>
          </div>
        )
      }
      
      if (part.type.startsWith('tool-')) {
        const toolPart = part as any
        return (
          <div key={index} className="text-xs text-muted-foreground">
            Tool: {toolPart.type.replace('tool-', '')} ({toolPart.state})
            {toolPart.errorText && (
              <div className="text-destructive mt-1">Error: {toolPart.errorText}</div>
            )}
          </div>
        )
      }
      
      if (part.type.startsWith('data-')) {
        return renderDataPart(part, index)
      }
      
      if (part.type === 'step-start') {
        return (
          <div key={index} className="text-xs text-muted-foreground">
            Step started
          </div>
        )
      }
      
      return (
        <div key={index} className="text-xs text-muted-foreground">
          Unknown part: {part.type}
        </div>
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
                      {message.parts?.find(p => p.type === 'text') ? (message.parts.find(p => p.type === 'text') as any).text : ''}
                    </p>
                  ) : (
                    <div className="text-sm [&>*]:block space-y-4 [&>[data-kind=item]+[data-kind=item]]:!mt-1">
                      {renderMessageParts(message)}
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