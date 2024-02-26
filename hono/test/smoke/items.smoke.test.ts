import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import app from '../../src/index'
import type { items } from '../../src/schema'
import * as schema from '../../src/schema'
import { clean, provision, seed } from '../utils/db'
import { PartialItemFactory } from '../utils/factory/items'

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
  afterAll(async () => {
    await clean(DB_NAME)
  })

  let describeItem1: typeof items

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
    const testItem1 = new PartialItemFactory(1)
    const res = await app.request(`/api/items/${describeItem1.id}`, {
      method: 'PUT',
      body: JSON.stringify(testItem1),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = (await res.json()) as (typeof items)[]
    expect(res.status).toBe(200)
    expect(json).toMatchObject([testItem1])
  })

  test('DELETE /items: should delete existing item', async () => {
    const testItem1 = new PartialItemFactory(1)
    const res = await app.request(`/api/items/${describeItem1.id}`, {
      method: 'DELETE',
    })
    const json = (await res.json()) as (typeof items)[]
    expect(res.status).toBe(200)
    expect(json).toMatchObject([testItem1])
  })
})

//describe('[Smoke] Items: simple test, seeded [items-simple]', () => {
//  beforeAll(async () => {
//    await seed(DB_NAME, ['items-simple.sql'])
//  })
//
//  afterAll(async () => {
//    await clean(DB_NAME)
//  })
//
//  test('GET /items: should return 5 seeded items', async () => {
//    const res = await app.request('/api/items')
//    expect(res.status).toBe(200)
//    expect(await res.json()).toEqual(seededItemsSimple())
//  })
//})
