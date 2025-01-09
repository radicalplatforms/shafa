import { AppType } from '../../../hono/src/index'
import { hc } from 'hono/client'
import type { InferResponseType } from 'hono/client'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api'

export const client = hc<AppType>(API_URL, {
  headers: {
    'Content-Type': 'application/json'
  }
})

// Export commonly used response types
export type OutfitsResponse = InferResponseType<typeof client.outfits.$get>
export type ItemsResponse = InferResponseType<typeof client.items.$get>

