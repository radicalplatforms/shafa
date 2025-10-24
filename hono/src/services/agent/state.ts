import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'

import { agentConversation } from '../../schema'
import type { DBVariables } from '../../utils/inject-db'
import type { AgentState } from './types'

export async function loadState(
  db: DBVariables['db'],
  userId: string,
  conversationId?: string
): Promise<AgentState | null> {
  console.log('[State] Loading state for user:', userId, 'conversationId:', conversationId)

  if (!conversationId) {
    console.log('[State] No conversationId provided, returning null')
    return null
  }

  const result = await db.query.agentConversation.findFirst({
    where: eq(agentConversation.id, conversationId),
  })

  if (!result || result.userId !== userId) {
    console.log('[State] No conversation found or userId mismatch, returning null')
    return null
  }

  const storedState = result.state as { messages: any[]; context: any }
  console.log('[State] State loaded successfully:', {
    conversationId: result.id,
    messageCount: storedState.messages?.length || 0,
    hasContext: !!storedState.context,
  })

  return {
    conversationId: result.id,
    userId: result.userId,
    messages: storedState.messages || [],
    context: storedState.context || { userId },
    lastMessageAt: result.lastMessageAt,
    createdAt: result.createdAt,
  }
}

export async function saveState(db: DBVariables['db'], state: AgentState): Promise<string> {
  const conversationId = state.conversationId || createId()
  const now = new Date()

  console.log(
    '[State] Saving state for user:',
    state.userId,
    'conversationId:',
    conversationId,
    'messageCount:',
    state.messages.length
  )

  const stateData = {
    messages: state.messages,
    context: state.context,
  }

  await db
    .insert(agentConversation)
    .values({
      id: conversationId,
      userId: state.userId,
      state: stateData as any,
      lastMessageAt: now,
    })
    .onConflictDoUpdate({
      target: agentConversation.id,
      set: {
        state: stateData as any,
        lastMessageAt: now,
      },
    })

  console.log('[State] State saved successfully:', conversationId)
  return conversationId
}
