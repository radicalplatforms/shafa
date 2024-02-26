import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import app from '../../src/index'
import type { items } from '../../src/schema'
import * as schema from '../../src/schema'
import { clean, provision, seed } from '../utils/db'
import type { ItemFactory } from '../utils/factory/items'
import { PartialItemFactory } from '../utils/factory/items'
import type { ItemToOutfitFactory } from '../utils/factory/items-outfits'
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
const DB_URL = `postgres://localhost:5555/${DB_NAME}`

// NOTE: Beware of jest hoisting!
//       .mock() will be automatically hoisted to the top of the code block,
//       because of this function decomposition is not possible without overhead
jest.mock('../../src/utils/inject-db', () => {
  const originalModule = jest.requireActual('../../src/utils/inject-db')
  return {
    __esModule: true,
    ...originalModule,
    default: async (c: Context, next: Function) => {
      c.set('db', drizzle(postgres(`postgres://localhost:5555/${DB_NAME}`), { schema }))
      await next()
    },
  }
})

beforeAll(async () => {
  await provision(DB_NAME)
})

describe('[Smoke] Items: simple test on each endpoint, no seeding', () => {
  let describeItem1: typeof items
  let describeItem2: typeof items

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('GET /items: should return no items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test('POST /items: should create and return one item', async () => {
    const testItem1 = new PartialItemFactory(1)
    const res = await app.request('/api/items', {
      method: 'POST',
      body: JSON.stringify(testItem1),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = (await res.json()) as (typeof items)[]
    expect(res.status).toBe(200)
    expect(json).toMatchObject([testItem1])
    describeItem1 = json[0]
  })

  test('PUT /items: should update existing item', async () => {
    const testItem2 = new PartialItemFactory(2)
    const res = await app.request(`/api/items/${describeItem1.id}`, {
      method: 'PUT',
      body: JSON.stringify(testItem2),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = (await res.json()) as (typeof items)[]
    expect(res.status).toBe(200)
    expect(json).toMatchObject([testItem2])
    describeItem2 = json[0]
  })

  test('DELETE /items: should delete existing item', async () => {
    const res = await app.request(`/api/items/${describeItem1.id}`, {
      method: 'DELETE',
    })
    const json = (await res.json()) as (typeof items)[]
    expect(res.status).toBe(200)
    expect(json).toMatchObject([describeItem2])
  })
})

describe('[Smoke] Items: simple test, seeded [basic-small-seed]', () => {
  let seededItems: ItemFactory[]
  let seededOutfits: OutfitFactory[]
  let seededItemToOutfits: ItemToOutfitFactory[]

  beforeAll(async () => {
    ;[seededItems, seededOutfits, seededItemToOutfits] = await basicSmallSeed(DB_URL)
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('GET /items: should return 5 seeded items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    // expect(await res.json()).toMatchObject(seededItems)
  })
})
