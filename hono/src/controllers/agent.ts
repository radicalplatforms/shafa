import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { executeAgentStream } from '../services/agent/executor'
import { requireAuth } from '../utils/auth'
import type { AuthVariables } from '../utils/auth'
import type { DBVariables } from '../utils/inject-db'
import injectDB from '../utils/inject-db'
import type { ServiceVariables } from '../utils/inject-services'
import injectServices from '../utils/inject-services'

const agentRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
})

const app = new Hono<{ Variables: AuthVariables & DBVariables & ServiceVariables }>().post(
  '/',
  zValidator('json', agentRequestSchema),
  requireAuth,
  injectDB,
  injectServices,
  async (c) => {
    const auth = c.get('auth')
    const userId = auth?.userId || ''
    const { message, conversationId } = c.req.valid('json')
    const db = c.get('db')

    c.set('isAgentRequest', true)

    // Set SSE headers
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    const result = executeAgentStream({
      userId,
      message,
      conversationId,
      itemService: c.get('itemService'),
      outfitService: c.get('outfitService'),
      similarityService: c.get('similarityService'),
      weatherService: c.get('weatherService'),
      db,
    })

    const encoder = new TextEncoder()
    let chunkCount = 0
    let totalBytesSent = 0

    console.log('[Controller] Starting SSE stream for user:', userId)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result) {
            chunkCount++
            let sseData = ''

            if (chunk.type === 'text-delta' && chunk.textDelta && chunk.textDelta.trim()) {
              sseData = `event: text-delta\ndata: ${JSON.stringify({ textDelta: chunk.textDelta })}\n\n`
              console.log(`[Controller] Sending text-delta chunk ${chunkCount}:`, {
                textDeltaLength: chunk.textDelta.length,
                preview:
                  chunk.textDelta.substring(0, 50) + (chunk.textDelta.length > 50 ? '...' : ''),
              })
            } else if (chunk.type === 'status') {
              sseData = `event: status\ndata: ${JSON.stringify({ status: chunk.status })}\n\n`
              console.log(`[Controller] Sending status chunk ${chunkCount}:`, chunk.status)
            } else if (chunk.type === 'metadata') {
              sseData = `event: metadata\ndata: ${JSON.stringify({ conversationId: chunk.metadata.conversationId })}\n\n`
              console.log(
                `[Controller] Sending metadata chunk ${chunkCount}:`,
                chunk.metadata.conversationId
              )
            }

            if (sseData) {
              const encoded = encoder.encode(sseData)
              totalBytesSent += encoded.length
              console.log(`[Controller] Enqueuing chunk ${chunkCount}:`, {
                sseDataLength: sseData.length,
                encodedLength: encoded.length,
                totalBytesSent,
              })
              controller.enqueue(encoded)
            }
          }

          // Send end event
          console.log(
            `[Controller] Stream completed - total chunks: ${chunkCount}, total bytes: ${totalBytesSent}`
          )
          controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`))
          controller.close()
        } catch (error) {
          console.error('[Controller] SSE stream error:', error)
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }
)

export default app
