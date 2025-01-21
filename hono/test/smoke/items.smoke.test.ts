import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'

import app from '../../src/index'
import * as schema from '../../src/schema'
import { clean, provision } from '../utils/db'
import { type ItemAPI, ItemFactory, PartialItemFactory } from '../utils/factory/items'
import type { ItemToOutfitFactory } from '../utils/factory/items-outfits'
import { itemsComputeLastWornAt } from '../utils/factory/items-outfits'
import type { OutfitFactory } from '../utils/factory/outfits'
import basicSmallSeed from '../utils/seeds/basic-small-seed'

/**
 * Items Smoke Tests
 *
 * Smoke testing, also known as 'build verification testing', is a type of
 * software testing that comprises a non-exhaustive set of tests that aim at
 * ensuring that the most critical functions work. The result of this testing is
 * used to decide if a build is stable enough to proceed with further testing.
 *
 * Here we are testing the set of "items" APIs in a non-exhaustive way. A good
 * guideline is to hit every endpoint and not dig deep into edge cases.
 */

const DB_NAME = 'items_smoke_test'
const DB_PORT = 5555
const DB_URL = `postgres://localhost:${DB_PORT}/${DB_NAME}`

// NOTE: Beware of jest hoisting!
//       .mock() will be automatically hoisted to the top of the code block,
//       because of this function decomposition is not possible without overhead
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

describe('[Smoke] Items: simple test on each endpoint, no seeding', () => {
  const testItems: ItemFactory[] = []

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('GET /items: should return no items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [], last_page: true })
  })

  test('POST /items: should create and return one item', async () => {
    const testPartialItem1 = new PartialItemFactory(1)
    const res = await app.request('/api/items', {
      method: 'POST',
      body: JSON.stringify(testPartialItem1),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testPartialItem1.formatAPI())
    testItems[0] = new ItemFactory(undefined, resJSON)
  })

  test('GET /items: should return created item', async () => {
    const res = await app.request(`/api/items/${testItems[0].id}`)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testItems[0].formatAPI())
  })

  test('PUT /items: should update existing item', async () => {
    const testPartialItem2 = new PartialItemFactory(2)
    const res = await app.request(`/api/items/${testItems[0].id}`, {
      method: 'PUT',
      body: JSON.stringify(testPartialItem2),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testPartialItem2.formatAPI())
    testItems[0] = new ItemFactory(undefined, resJSON)
  })

  test('GET /items: should return updated item', async () => {
    const res = await app.request(`/api/items/${testItems[0].id}`)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testItems[0].formatAPI())
  })

  test('DELETE /items: should delete existing item', async () => {
    const res = await app.request(`/api/items/${testItems[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testItems[0].formatAPI({ omitLastWornAt: true }))
    testItems.splice(0, 1)
  })
})

describe('[Smoke] Items: simple test, seeded [basic-small-seed]', () => {
  let testItems: ItemFactory[] = []
  let testOutfits: OutfitFactory[] = []
  let testItemsToOutfits: ItemToOutfitFactory[] = []

  beforeAll(async () => {
    ;[testItems, testOutfits, testItemsToOutfits] = await basicSmallSeed(DB_NAME, DB_PORT)
    testItems = itemsComputeLastWornAt(testItems, testOutfits, testItemsToOutfits)
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  async function validateItemsGetter() {
    const res = await app.request('/api/items')
    const resJSON = (await res.json()) as { items: ItemAPI[]; last_page: boolean }
    testItems = itemsComputeLastWornAt(testItems, testOutfits, testItemsToOutfits)
    expect(res.status).toBe(200)
    expect(resJSON.items).toEqual(testItems.map((item) => item.formatAPI()))
    expect(resJSON.last_page).toEqual(true)
  }

  test('GET /items: should return 5 seeded items', validateItemsGetter)

  test('DELETE /items: should delete existing seeded item', async () => {
    const res = await app.request(`/api/items/${testItems[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testItems[0].formatAPI({ omitLastWornAt: true }))
    testItems.splice(0, 1)
    testOutfits = []
    testItemsToOutfits = []
  })

  test('GET /items: should return 4 seeded items', validateItemsGetter)

  test('POST /items: should create and return one item', async () => {
    const testPartialItem1 = new PartialItemFactory(1)
    const res = await app.request('/api/items', {
      method: 'POST',
      body: JSON.stringify(testPartialItem1),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testPartialItem1.formatAPI())
    testItems.push(new ItemFactory(undefined, resJSON))
  })

  test('GET /items: should return 5 seeded/inserted items', validateItemsGetter)

  test('PUT /items: should update existing item', async () => {
    const testPartialItem2 = new PartialItemFactory(2)
    const res = await app.request(`/api/items/${testItems[0].id}`, {
      method: 'PUT',
      body: JSON.stringify(testPartialItem2),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testPartialItem2.formatAPI())
    testItems[0] = new ItemFactory(undefined, resJSON)
  })

  test('GET /items: should return 5 seeded/inserted/updated items', validateItemsGetter)
})

describe('[Smoke] Items: sorting, seeded [basic-small-seed]', () => {
  let testItems: ItemFactory[] = []
  let testOutfits: OutfitFactory[] = []
  let testItemsToOutfits: ItemToOutfitFactory[] = []

  beforeAll(async () => {
    ;[testItems, testOutfits, testItemsToOutfits] = await basicSmallSeed(DB_NAME, DB_PORT)
    testItems = itemsComputeLastWornAt(testItems, testOutfits, testItemsToOutfits)
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  async function validateItemsGetter() {
    const res = await app.request('/api/items')
    const resJSON = (await res.json()) as { items: ItemAPI[]; last_page: boolean }
    testItems = itemsComputeLastWornAt(testItems, testOutfits, testItemsToOutfits)
    expect(res.status).toBe(200)
    expect(resJSON.items).toEqual(testItems.map((item) => item.formatAPI()))
    expect(resJSON.last_page).toEqual(true)
  }

  test('GET /items: should return 5 seeded items', validateItemsGetter)

  test('POST /items: should create and return one item', async () => {
    const testPartialItem1 = new PartialItemFactory(1)
    const res = await app.request('/api/items', {
      method: 'POST',
      body: JSON.stringify(testPartialItem1),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testPartialItem1.formatAPI())
    testItems.push(new ItemFactory(undefined, resJSON))
  })

  test('GET /items: should return 6 seeded/inserted items', validateItemsGetter)

  test('DELETE /items: should delete existing inserted item', async () => {
    const res = await app.request(`/api/items/${testItems[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testItems[0].formatAPI({ omitLastWornAt: true }))
    testItems.splice(0, 1)
  })

  test('GET /items: should return 5 seeded items after inserted deletion', validateItemsGetter)

  test('DELETE /items: should delete existing seeded item', async () => {
    const res = await app.request(`/api/items/${testItems[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testItems[0].formatAPI({ omitLastWornAt: true }))
    testItems.splice(0, 1)
    testOutfits = []
    testItemsToOutfits = []
  })

  test('GET /items: should return 4 seeded items after seeded deletion', validateItemsGetter)
})
