import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import app from '../../src/index'
import * as schema from '../../src/schema'
import { clean, provision } from '../utils/db'
import { type ItemAPI, ItemFactory, PartialItemFactory } from '../utils/factory/items'
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
    expect(await res.json()).toEqual({"items": [], "total": 0})
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

  test('DELETE /items: should delete existing item', async () => {
    const res = await app.request(`/api/items/${testItems[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testItems[0].formatAPI())
    testItems.splice(0, 1)
  })
})

describe('[Smoke] Items: simple test, seeded [basic-small-seed]', () => {
  let testItems: ItemFactory[] = []

  beforeAll(async () => {
    ;[testItems] = await basicSmallSeed(DB_NAME, DB_PORT)
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  async function validateItemsGetter() {
    const res = await app.request('/api/items')
    const responseBody = await res.json() as { items: Array<JSON>, total: number };
    expect(res.status).toBe(200)
    expect(responseBody.items).toEqual(testItems.map((item) => item.formatAPI()))
  }

  test('GET /items: should return 5 seeded items', validateItemsGetter)

  test('DELETE /items: should delete existing seeded item', async () => {
    const res = await app.request(`/api/items/${testItems[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testItems[0].formatAPI())
    testItems.splice(0, 1)
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
    testItems[4] = new ItemFactory(undefined, resJSON)
  })

  test('GET /items: should return 5 seeded/inserted items', validateItemsGetter)

  test('PUT /items: should update existing item', async () => {
    const testPartialItem2 = new PartialItemFactory(2)
    const res = await app.request(`/api/items/${testItems[4].id}`, {
      method: 'PUT',
      body: JSON.stringify(testPartialItem2),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as ItemAPI
    expect(resJSON).toMatchObject(testPartialItem2.formatAPI())
    testItems[4] = new ItemFactory(undefined, resJSON)
  })

  test('GET /items: should return 5 seeded/inserted/updated items', validateItemsGetter)
})
