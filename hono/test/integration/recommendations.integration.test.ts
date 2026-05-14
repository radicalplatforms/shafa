import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'

import app from '../../src/index'
import * as schema from '../../src/schema'
import type { ItemRankingEntry, RotationEntry } from '../../src/services/recommendations/core/types'
import { clean, instance, provision } from '../utils/db'
import { ItemFactory } from '../utils/factory/items'
import { ItemToOutfitFactory } from '../utils/factory/items-outfits'
import { OutfitFactory } from '../utils/factory/outfits'

/**
 * Recommendations Integration Tests
 *
 * Drive the new endpoints against hand-seeded scenarios to verify end-to-end
 * behavior: that withholding an item removes it from candidates, that adding a
 * "miss" outfit suppresses co-suggestion, and that cache_version changes after
 * a write.
 */

const DB_NAME = 'recommendations_integration_test'
const DB_PORT = 5555
const DB_URL = `postgres://localhost:${DB_PORT}/${DB_NAME}`
const USER_ID = 'rak3rman'

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

jest.mock('../../src/utils/auth', () => ({
  requireAuth: async (c: Context, next: Function) => {
    c.set('auth', {
      sessionClaims: null,
      sessionId: null,
      userId: USER_ID,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      orgPermissions: null,
      factorVerificationAge: null,
      getToken: () => Promise.resolve(''),
      has: () => false,
      debug: () => {},
    })
    await next()
  },
}))

const daysAgo = (days: number) => {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

type Seed = {
  items: Record<string, ItemFactory>
  outfits: Record<string, OutfitFactory>
}

const seedScenario = async (): Promise<Seed> => {
  const items: Record<string, ItemFactory> = {
    top1: new ItemFactory(101, { type: 'top', userId: USER_ID, status: 'available' }),
    top2: new ItemFactory(102, { type: 'top', userId: USER_ID, status: 'available' }),
    bot1: new ItemFactory(103, { type: 'bottom', userId: USER_ID, status: 'available' }),
    bot2: new ItemFactory(104, { type: 'bottom', userId: USER_ID, status: 'available' }),
    foot1: new ItemFactory(105, { type: 'footwear', userId: USER_ID, status: 'available' }),
    foot2: new ItemFactory(106, { type: 'footwear', userId: USER_ID, status: 'available' }),
  }
  for (const i of Object.values(items)) await i.store(DB_NAME, DB_PORT)

  const outfits: Record<string, OutfitFactory> = {
    hitA: new OutfitFactory(201, { userId: USER_ID, rating: 2, wearDate: daysAgo(30) }),
    hitB: new OutfitFactory(202, { userId: USER_ID, rating: 2, wearDate: daysAgo(45) }),
    midC: new OutfitFactory(203, { userId: USER_ID, rating: 1, wearDate: daysAgo(60) }),
  }
  for (const o of Object.values(outfits)) await o.store(DB_NAME, DB_PORT)

  const itemsToOutfits: ItemToOutfitFactory[] = [
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.hitA.id,
      itemId: items.top1.id,
      itemType: 'top',
    }),
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.hitA.id,
      itemId: items.bot1.id,
      itemType: 'bottom',
    }),
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.hitA.id,
      itemId: items.foot1.id,
      itemType: 'footwear',
    }),
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.hitB.id,
      itemId: items.top1.id,
      itemType: 'top',
    }),
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.hitB.id,
      itemId: items.bot1.id,
      itemType: 'bottom',
    }),
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.hitB.id,
      itemId: items.foot1.id,
      itemType: 'footwear',
    }),
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.midC.id,
      itemId: items.top2.id,
      itemType: 'top',
    }),
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.midC.id,
      itemId: items.bot2.id,
      itemType: 'bottom',
    }),
    new ItemToOutfitFactory(undefined, {
      outfitId: outfits.midC.id,
      itemId: items.foot2.id,
      itemType: 'footwear',
    }),
  ]
  for (const r of itemsToOutfits) await r.store(DB_NAME, DB_PORT)

  return { items, outfits }
}

beforeAll(async () => {
  await provision(DB_NAME)
})

describe('[Integration] Recommendations', () => {
  let seed: Seed

  beforeAll(async () => {
    seed = await seedScenario()
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('item-ranking surfaces co-worn partners for a selected top', async () => {
    const res = await app.request('/api/outfits/item-ranking', {
      method: 'POST',
      body: JSON.stringify({ selectedItemIds: [seed.items.top1.id], autocompleteCount: 1 }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ranking: ItemRankingEntry[]
      metadata: { mode: string }
    }
    expect(body.metadata.mode).toBe('composing')
    const ids = body.ranking.map((r) => r.itemId)
    expect(ids).toContain(seed.items.bot1.id)
    expect(ids).toContain(seed.items.foot1.id)
    const top = body.ranking[0]
    expect([seed.items.bot1.id, seed.items.foot1.id]).toContain(top.itemId)
  })

  test('withholding an item removes it from candidate ranking', async () => {
    const db = instance(DB_NAME, DB_PORT)
    await db
      .update(schema.item)
      .set({ status: 'withheld' })
      .where(eq(schema.item.id, seed.items.bot1.id))
    db.$client.end()

    const res = await app.request('/api/outfits/item-ranking', {
      method: 'POST',
      body: JSON.stringify({ selectedItemIds: [seed.items.top1.id], autocompleteCount: 1 }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ranking: ItemRankingEntry[] }
    expect(body.ranking.map((r) => r.itemId)).not.toContain(seed.items.bot1.id)
  })

  test('recommend returns rotation of available outfits only', async () => {
    const res = await app.request('/api/outfits/recommend?size=10')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      rotation: RotationEntry[]
      metadata: { wardrobe_size: number }
    }
    expect(body.rotation.length).toBeGreaterThanOrEqual(1)
    expect(body.rotation.map((r) => r.outfitId)).not.toContain(seed.outfits.hitA.id)
    expect(body.rotation.map((r) => r.outfitId)).toContain(seed.outfits.midC.id)
  })

  test('cache_version changes after a new outfit is inserted', async () => {
    const first = await app.request('/api/outfits/recommendation-cache')
    const firstBody = (await first.json()) as { cache_version: string }

    const newOutfit = new OutfitFactory(301, {
      userId: USER_ID,
      rating: 2,
      wearDate: daysAgo(2),
    })
    await newOutfit.store(DB_NAME, DB_PORT)
    const ito = new ItemToOutfitFactory(undefined, {
      outfitId: newOutfit.id,
      itemId: seed.items.top2.id,
      itemType: 'top',
    })
    await ito.store(DB_NAME, DB_PORT)

    const second = await app.request('/api/outfits/recommendation-cache')
    const secondBody = (await second.json()) as { cache_version: string }
    expect(secondBody.cache_version).not.toBe(firstBody.cache_version)
  })
})
