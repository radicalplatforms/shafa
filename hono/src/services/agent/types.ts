import type { UIMessage } from 'ai'

export type Route = 'unsafe' | 'offtopic' | 'travel' | 'general'

export interface RouteResult {
  route: Route
  reason: string
  summary: string
  response: string
}

export interface TravelContext {
  city?: string
  startDate?: string
  endDate?: string
  tripLength?: number
  tagMix?: Record<string, number>
  itemLimits?: Record<string, number>
  laundryDay?: number | null
}

export interface AgentState {
  conversationId: string
  userId: string
  messages: UIMessage[]
  lastMessageAt: Date
  createdAt: Date
}
