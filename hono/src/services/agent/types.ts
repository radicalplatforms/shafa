import type { CoreMessage as Message } from 'ai'

export type Route = 'unsafe' | 'offtopic' | 'travel' | 'general'

export interface RouteResult {
  route: Route
  reason: string
  summary: string
  response: string
}

export interface ConversationContext {
  userId: string
  conversationId?: string
  // Travel session memory
  travelContext?: {
    city?: string
    startDate?: string
    endDate?: string
    tripLength?: number
    tagMix?: Record<string, number> // outfit counts per tag
    itemLimits?: Record<string, number> // limits per item type (e.g., { footwear: 2, layer: 1, accessory: 3 })
    laundryDay?: number | null
  }
}

export interface AgentState {
  conversationId: string
  userId: string
  messages: Message[]
  context: ConversationContext
  lastMessageAt: Date
  createdAt: Date
}
