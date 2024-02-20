import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import app from '../src/index'
import type { items } from '../src/schema'
import * as schema from '../src/schema'
import { seededItemsSimple, validItem } from './factory/items'
import { clean, provision, seed } from './utils/db'

const DB_NAME = 'items_test'

// NOTE: Beware of jest hoisting!
//       .mock() will be automatically hoisted to the top of the code block,
//       because of this function decomposition is not possible without overhead
jest.mock('../src/utils/injectDB', () => {
  const originalModule = jest.requireActual('../src/utils/injectDB')
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

describe('Items: No Seeding', () => {
  beforeEach(async () => {
    await clean(DB_NAME)
  })

  test('GET /items: should return no items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test('POST /items: should create and return one item', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      body: JSON.stringify(validItem()),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = (await res.json()) as (typeof items)[]
    expect(res.status).toBe(200)
    expect(json).toMatchObject([validItem()])
  })
})

describe('Items: Seeded [items-simple]', () => {
  beforeAll(async () => {
    await clean(DB_NAME)
    await seed(DB_NAME, ['items-simple.sql'])
  })

  test('GET /items: should return 5 seeded items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(seededItemsSimple())
  })
})
