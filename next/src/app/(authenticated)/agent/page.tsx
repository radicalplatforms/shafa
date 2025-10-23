'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAgent, useItems, useOutfits, useTags } from '@/lib/client'
import type { AgentResponse, AgentMessage, ComposedOutfit } from '@/lib/types'
import { ItemList } from '@/components/ItemList'
import { OutfitList } from '@/components/OutfitList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FilterTag } from '@/components/ui/tag'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Component to render a composed outfit created by the agent
 */
function ComposedOutfitCard({ outfit }: { outfit: ComposedOutfit }) {
  const { items } = useItems()
  const { tags } = useTags()
  
  // Get the actual item objects from IDs
  const outfitItems = outfit.items.map(composedItem => {
    const item = items.find(i => i.id === composedItem.itemId)
    return item ? { ...item, itemType: composedItem.itemType } : null
  }).filter(Boolean)

  // Get the actual tag objects from IDs
  const outfitTags = outfit.tagIds?.map(tagId => {
    return tags?.find(t => t.id === tagId)
  }).filter(Boolean) || []

  if (outfitItems.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <p className="text-muted-foreground">Unable to load outfit items</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Agent-Composed Outfit</CardTitle>
        {outfit.reasoning && (
          <p className="text-sm text-muted-foreground">{outfit.reasoning}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items in the outfit */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {outfitItems.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="aspect-square relative overflow-hidden rounded-lg bg-muted">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs border border-dashed bg-transparent text-muted-foreground">
                  {item.type}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tags */}
        {outfitTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suggested Tags:</p>
            <div className="flex flex-wrap gap-2">
              {outfitTags.map((tag) => (
                <FilterTag
                  key={tag.id}
                  name={tag.name}
                  hexColor={tag.hexColor}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Component to render agent response messages
 */
function AgentMessageRenderer({ message }: { message: AgentMessage }) {
  const { items } = useItems()
  const { outfits } = useOutfits()

  switch (message.type) {
    case 'text':
      return (
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      )

    case 'items':
      const filteredItems = items.filter(item => message.content.includes(item.id))
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recommended Items</h3>
          <ItemList items={filteredItems} />
        </div>
      )

    case 'outfits':
      const filteredOutfits = outfits.filter(outfit => message.content.includes(outfit.id))
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recommended Outfits</h3>
          <OutfitList outfits={filteredOutfits} />
        </div>
      )

    case 'composed_outfits':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">New Outfit Suggestions</h3>
          <div className="space-y-4">
            {message.content.map((outfit, index) => (
              <ComposedOutfitCard key={index} outfit={outfit} />
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}

export default function AgentPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q')
  
  const { sendMessage } = useAgent()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<AgentResponse | null>(null)
  const [userMessage, setUserMessage] = useState<string>('')

  useEffect(() => {
    if (initialQuery) {
      setUserMessage(initialQuery)
      handleSendMessage(initialQuery)
    }
  }, [initialQuery])

  const handleSendMessage = async (message: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const agentResponse = await sendMessage(message)
      setResponse(agentResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Fashion Assistant</h1>
          <p className="text-muted-foreground">
            Get personalized styling advice and outfit recommendations
          </p>
        </div>

        {/* User Message */}
        {userMessage && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Question</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{userMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fashion Assistant is thinking...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Agent Response */}
        {response && !isLoading && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Fashion Assistant Response</h2>
            {response.messages.map((message, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <AgentMessageRenderer message={message} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!userMessage && !isLoading && !response && (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Welcome to your Fashion Assistant</h3>
              <p className="text-muted-foreground mb-4">
                Ask me anything about your wardrobe, styling advice, or outfit recommendations.
              </p>
              <p className="text-sm text-muted-foreground">
                Try asking: "What should I wear for a business meeting?" or "Help me plan outfits for a weekend trip"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
