import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { getUserId, requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'
import { PaginationInputSchema } from '../utils/pagination'
import { createSSEResponse } from '../utils/sse'
import { isValidUUID } from '../utils/uuid'

const messageRequestSchema = z.object({
  conversationId: z.string().refine(isValidUUID).optional(),
  text: z.string().min(1),
})

const messageIdSchema = z.object({
  id: z.string().refine(isValidUUID),
})

const conversationIdSchema = z.object({
  id: z.string().refine(isValidUUID),
})

const getConversationsSchema = PaginationInputSchema

const editMessageSchema = z.object({
  text: z.string().min(1),
})

const app = new Hono<{
  Variables: AuthVariables & ServiceVariables
}>()
  .get(
    '/conversations',
    zValidator('query', getConversationsSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { limit, offset } = c.req.valid('query')

      const result = await c
        .get('agentService')
        .conversations(userId, { limit, offset })

      return c.json(result)
    }
  )
  .get(
    '/conversations/:id',
    zValidator('param', conversationIdSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: conversationId } = c.req.valid('param')

      const conversation = await c
        .get('agentService')
        .conversationById(userId, conversationId)

      return c.json(conversation)
    }
  )
  .post(
    '/messages',
    zValidator('json', messageRequestSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { conversationId, text } = c.req.valid('json')

      const agentService = c.get('agentService')
      return agentService.createMessage(userId, text, conversationId)
    }
  )
  .post(
    '/messages/:id/retry',
    zValidator('param', messageIdSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: messageId } = c.req.valid('param')

      const agentService = c.get('agentService')
      const stream = agentService.retryMessage(userId, messageId)

      return createSSEResponse(stream, { userId, messageId })
    }
  )
  .post(
    '/messages/:id/edit',
    zValidator('param', messageIdSchema),
    zValidator('json', editMessageSchema),
    requireAuth,
    injectServices,
    async (c) => {
      const userId = getUserId(c)
      const { id: messageId } = c.req.valid('param')
      const { text } = c.req.valid('json')

      const agentService = c.get('agentService')
      const stream = agentService.editMessage(userId, messageId, text)

      return createSSEResponse(stream, { userId, messageId })
    }
  )

export default app
