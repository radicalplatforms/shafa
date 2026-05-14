import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'

import app from '../../src/index'
import * as schema from '../../src/schema'
import type {
  GradeLetter,
  ItemRankingEntry,
  RotationEntry,
} from '../../src/services/recommendations/core/types'
import { clean, provision } from '../utils/db'
import type { ItemFactory } from '../utils/factory/items'
import type { ItemToOutfitFactory } from '../utils/factory/items-outfits'
import type { OutfitFactory } from '../utils/factory/outfits'
import type { TagFactory } from '../utils/factory/tags'
import type { TagToOutfitFactory } from '../utils/factory/tags-outfits'
import basicSmallSeed from '../utils/seeds/basic-small-seed'

/**
 * Recommendations Smoke Tests
 *
 * Verify each new endpoint returns the documented shape against a small seeded
 * scenario. Heavy edge-case coverage lives in the unit suite.
 */

const DB_NAME = 'recommendations_smoke_test'
const DB_PORT = 5555
const DB_URL = `postgres://localhost:${DB_PORT}/${DB_NAME}`

jest.mock('../../src/utils/inject-db', () => {
  const originalModule = jest.requireActual('../../src/utils/inject-db')
  return {
    __esModule: true,
    ...originalModule,
    default: async (c: Context, next: Function) => {
      c.set('db', drizzle(postgres(DB_URL), { schema }))
      await next()
    },
  }
})

beforeAll(async () => {
  await provision(DB_NAME)
})

describe('[Smoke] Recommendations: Seeded [basic-small-seed]', () => {
  let testItems: ItemFactory[]
  let testOutfits: OutfitFactory[]
  let testItemsToOutfits: ItemToOutfitFactory[]
  let testTags: TagFactory[]
  let testTagsToOutfits: TagToOutfitFactory[]

  beforeAll(async () => {
    ;[testItems, testOutfits, testItemsToOutfits, testTags, , testTagsToOutfits] =
      await basicSmallSeed(DB_NAME, DB_PORT)
    // touch unused factory locals to keep type imports referenced
    void testOutfits
    void testItemsToOutfits
    void testTags
    void testTagsToOutfits
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('POST /outfits/item-ranking: starter mode with empty selection', async () => {
    const res = await app.request('/api/outfits/item-ranking', {
      method: 'POST',
      body: JSON.stringify({ selectedItemIds: [] }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ranking: ItemRankingEntry[]
      autocomplete_count: number
      generated_at: string
      metadata: {
        algorithm_version: string
        corpus_size: number
        gap_types: string[]
        mode: 'starter' | 'composing'
        autocomplete_reason?: string
      }
    }
    expect(Array.isArray(body.ranking)).toBe(true)
    expect(body.metadata.mode).toBe('starter')
    expect(body.metadata.algorithm_version).toBe('v3')
    expect(body.autocomplete_count).toBe(0)
    expect(body.ranking.every((e) => e.isAutocomplete === false)).toBe(true)
  })

  test('POST /outfits/item-ranking: composing mode with valid selection', async () => {
    const tops = testItems.filter((i) => i.type === 'top')
    const selection = tops.slice(0, 1).map((i) => i.id)
    const res = await app.request('/api/outfits/item-ranking', {
      method: 'POST',
      body: JSON.stringify({ selectedItemIds: selection, autocompleteCount: 2 }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ranking: ItemRankingEntry[]
      autocomplete_count: number
      metadata: { mode: 'starter' | 'composing' }
    }
    expect(body.metadata.mode).toBe('composing')
    expect(body.ranking.every((e) => e.itemId !== selection[0])).toBe(true)
  })

  test('POST /outfits/item-ranking: foreign item id returns 400', async () => {
    const res = await app.request('/api/outfits/item-ranking', {
      method: 'POST',
      body: JSON.stringify({ selectedItemIds: ['kkkkkkkkkkkkkkkkkkkkkkkk'] }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { reason: string }
    expect(body.reason).toBe('invalid_selection')
  })

  test('GET /outfits/recommend: returns rotation shape', async () => {
    const res = await app.request('/api/outfits/recommend?size=5')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      rotation: RotationEntry[]
      generated_at: string
      metadata: {
        algorithm_version: string
        wardrobe_size: number
        rotation_size: number
        requested_size: number
        reason?: string
      }
    }
    expect(body.metadata.algorithm_version).toBe('v3')
    expect(body.metadata.requested_size).toBe(5)
    expect(Array.isArray(body.rotation)).toBe(true)
  })

  test('POST /outfits/grade: returns letter grade and breakdown', async () => {
    const selected = testItems.slice(0, 3).map((i) => i.id)
    const res = await app.request('/api/outfits/grade', {
      method: 'POST',
      body: JSON.stringify({ itemIds: selected }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      grade: GradeLetter
      score: number
      breakdown: {
        freshness: { term: number; avg: number; min: number }
        cohorrence: {
          term: number
          mostRecentOverlap: { outfitId: string; sharedItems: string[]; daysAgo: number } | null
        }
      }
      metadata: { algorithm_version: string; cold_start: boolean }
    }
    expect(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']).toContain(body.grade)
    expect(body.score).toBeGreaterThanOrEqual(0)
    expect(body.score).toBeLessThanOrEqual(1)
    expect(body.breakdown.freshness).toBeDefined()
    expect(body.breakdown.cohorrence).toBeDefined()
    expect(body.metadata.algorithm_version).toBe('v3')
  })

  test('POST /outfits/grade: invalid item id returns 400', async () => {
    const res = await app.request('/api/outfits/grade', {
      method: 'POST',
      body: JSON.stringify({ itemIds: ['kkkkkkkkkkkkkkkkkkkkkkkk'] }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
  })

  test('GET /outfits/recommendation-cache: returns serialized cache with ETag and 304 revalidation', async () => {
    const res = await app.request('/api/outfits/recommendation-cache')
    expect(res.status).toBe(200)
    const etag = res.headers.get('etag')
    expect(etag).toBeTruthy()
    const body = (await res.json()) as {
      cache_version: string
      nodes: unknown[]
      edges: unknown[]
      recent_outfits: unknown[]
      corpus_size: number
      config: unknown
    }
    expect(typeof body.cache_version).toBe('string')
    expect(Array.isArray(body.nodes)).toBe(true)
    expect(Array.isArray(body.edges)).toBe(true)
    expect(Array.isArray(body.recent_outfits)).toBe(true)

    const second = await app.request('/api/outfits/recommendation-cache', {
      headers: { 'If-None-Match': etag! },
    })
    expect(second.status).toBe(304)
  })
})
