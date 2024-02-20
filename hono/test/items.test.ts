import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import app from '../src/index'
import * as schema from '../src/schema'
import { seededItemsSimple } from './factory/items'
import { createDbAndMigrate, seed } from './utils/db'

const DB_NAME = 'items_test'

function injectDBMock(db_name: string) {
  const originalModule = jest.requireActual('../src/utils/injectDB')
  return {
    __esModule: true,
    ...originalModule,
    default: async (c: Context, next: Function) => {
      const url = `postgres://localhost:5555/${db_name}`
      const queryClient = postgres(url)
      const db = drizzle(queryClient, { schema })
      c.set('db', db)
      await next()
    },
  }
}

jest.mock('../src/utils/injectDB', () => injectDBMock('items_test'))

beforeAll(async () => {
  await createDbAndMigrate(DB_NAME)
})

describe('Items: No Seeding', () => {
  test('GET /items: should return no items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  //  test('POST /items: should create and return one item', async () => {
  //    const res = await app.request('/api/items', {
  //      method: 'POST',
  //      body: JSON.stringify(validItem()),
  //      headers: { 'Content-Type': 'application/json' },
  //    })
  //    const json = (await res.json()) as (typeof items)[]
  //    expect(res.status).toBe(200)
  //    expect(json).toMatchObject([validItem()])
  //  })
})

describe('Items: Seeded [items-simple]', () => {
  beforeAll(async () => {
    await seed(DB_NAME, 5555, 16, ['items-simple.sql'])
  })

  test('GET /items: should return 5 seeded items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(seededItemsSimple())
  })
})
