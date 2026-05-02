import type { StreamChunk } from '../services/agent/executor'
import { createLogger } from './logger'

const logger = createLogger('SSE')

/**
 * Format a StreamChunk to Server-Sent Events (SSE) format.
 * Follows AI SDK UI streaming patterns for UIMessage-compatible chunks.
 *
 * @param {StreamChunk} chunk - The chunk to format
 * @returns {string | null} - SSE formatted string or null if chunk should be skipped
 */
function formatChunkToSSE(chunk: StreamChunk): string | null {
  switch (chunk.type) {
    case 'text-delta':
      if (!chunk.textDelta?.trim()) return null
      return `event: text-delta\ndata: ${JSON.stringify({ textDelta: chunk.textDelta })}\n\n`

    case 'reasoning-delta':
      if (!chunk.reasoningDelta?.trim()) return null
      return `event: reasoning-delta\ndata: ${JSON.stringify({ reasoningDelta: chunk.reasoningDelta })}\n\n`

    case 'tool-call':
      return `event: tool-call\ndata: ${JSON.stringify({ toolCall: chunk.toolCall })}\n\n`

    case 'data-part':
      return `event: data-part\ndata: ${JSON.stringify({ dataPart: chunk.dataPart })}\n\n`

    case 'step-start':
      return `event: step-start\ndata: ${JSON.stringify({ stepStart: chunk.stepStart })}\n\n`

    case 'status':
      return `event: status\ndata: ${JSON.stringify({ status: chunk.status })}\n\n`

    case 'metadata':
      return `event: metadata\ndata: ${JSON.stringify({ conversationId: chunk.metadata.conversationId })}\n\n`

    default:
      return null
  }
}

/**
 * Create an SSE Response from an async iterable of StreamChunks.
 *
 * @param {AsyncIterable<StreamChunk>} stream - The stream of chunks
 * @param {object} options - Options for logging
 * @param {string} [options.userId] - User ID for logging
 * @param {string} [options.conversationId] - Conversation ID for logging
 * @param {string} [options.messageId] - Message ID for logging
 * @returns {Response} - SSE Response
 */
export function createSSEResponse(
  stream: AsyncIterable<StreamChunk>,
  options?: {
    userId?: string
    conversationId?: string
    messageId?: string
  }
): Response {
  const encoder = new TextEncoder()
  let chunkCount = 0
  let totalBytesSent = 0

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          chunkCount++

          const sseData = formatChunkToSSE(chunk)
          if (sseData) {
            const encoded = encoder.encode(sseData)
            totalBytesSent += encoded.length
            controller.enqueue(encoded)
          }
        }

        logger.debug(`Stream complete (${chunkCount} chunks, ${totalBytesSent} bytes) [conv:${options?.conversationId?.slice(0, 8) || 'new'} msg:${options?.messageId?.slice(0, 8) || 'new'}]`)
        controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`))
        controller.close()
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Stream error occurred'
        logger.error(`Stream error: ${errorMessage} [conv:${options?.conversationId?.slice(0, 8) || 'new'} msg:${options?.messageId?.slice(0, 8) || 'new'} chunks:${chunkCount}]`)
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

