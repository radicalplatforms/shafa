import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import app from '../src/index'
import * as schema from '../src/schema'
import { seededOutfitsSimple } from './factory/outfits'
import { clean, provision, seed } from './utils/db'

const DB_NAME = 'outfits_test'

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

describe('Outfits: No Seeding', () => {
  beforeEach(async () => {
    await clean(DB_NAME)
  })

  test('GET /outfits: should return no outfits', async () => {
    const res = await app.request('/api/outfits')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})

describe('Outfits: Seeded [items-simple, outfits-simple]', () => {
  beforeAll(async () => {
    await clean(DB_NAME)
    await seed(DB_NAME, ['items-simple.sql', 'outfits-simple.sql'])
  })

  test('GET /outfits: should return 1 seeded outfit with items', async () => {
    const res = await app.request('/api/outfits')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(seededOutfitsSimple())
  })
})
