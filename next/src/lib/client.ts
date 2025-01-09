import { hc } from 'hono/client'
import type { AppType } from '../../../hono/src/index'
import type { InferResponseType } from 'hono/client'

// Use type assertion to any
export const client = hc(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api', {
  headers: {
    'Content-Type': 'application/json'
  }
}) as any

// Export commonly used response types
export type OutfitsResponse = InferResponseType<typeof client.outfits.$get>
export type ItemsResponse = InferResponseType<typeof client.items.$get>

