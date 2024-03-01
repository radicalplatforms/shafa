import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import app from '../../src/index'
import * as schema from '../../src/schema'
import { itemTypeEnum } from '../../src/schema'
import { clean, provision } from '../utils/db'
import type { ItemFactory } from '../utils/factory/items'
import type { ItemToOutfitFactory } from '../utils/factory/items-outfits'
import { type OutfitAPI, OutfitFactory, PartialOutfitFactory } from '../utils/factory/outfits'
import basicSmallSeed from '../utils/seeds/basic-small-seed'

/**
 * Outfits Smoke Tests
 *
 * Smoke testing, also known as 'build verification testing', is a type of
 * software testing that comprises a non-exhaustive set of tests that aim at
 * ensuring that the most critical functions work. The result of this testing is
 * used to decide if a build is stable enough to proceed with further testing.
 *
 * Here we are testing the set of "outfits" APIs in a non-exhaustive way. A good
 * guideline is to hit every endpoint and not dig deep into edge cases.
 */

const DB_NAME = 'outfits_smoke_test'
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

describe('[Smoke] Outfits: No Seeding', () => {
  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('GET /outfits: should return no outfits', async () => {
    const res = await app.request('/api/outfits')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  // NOTE: No additional testing here since POST /api/outfits requires items
  //       to map an outfit to, see seeded tests below
})

describe('[Smoke] Outfits: Seeded [basic-small-seed]', () => {
  let testItems: ItemFactory[]
  let testOutfits: OutfitFactory[]
  let testItemsToOutfits: ItemToOutfitFactory[]

  beforeAll(async () => {
    ;[testItems, testOutfits, testItemsToOutfits] = await basicSmallSeed(DB_NAME, DB_PORT)
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('GET /outfits: should return 1 seeded outfit with items', async () => {
    const res = await app.request('/api/outfits')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(
      testOutfits.map((outfit) => ({
        ...outfit.formatAPI(),
        itemsToOutfits: testItemsToOutfits
          .filter((itemToOutfit) => itemToOutfit.outfitId === outfit.id)
          .map((itemToOutfit) => ({
            itemType: itemToOutfit.itemType,
            item: testItems.find((item) => itemToOutfit.itemId === item.id)?.formatAPI(),
          })),
      }))
    )
  })

  test('POST /outfits: should create another outfit with the same items', async () => {
    const testOutfit1 = new PartialOutfitFactory(1)
    const res = await app.request('/api/outfits', {
      method: 'POST',
      body: JSON.stringify({
        ...testOutfit1,
        itemIdsTypes: testItems.map((item, i) => ({
          id: item.id,
          itemType: itemTypeEnum[(i + 1) % 5],
        })),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as OutfitAPI
    expect(resJSON).toMatchObject(testOutfit1.formatAPI())
    testOutfits[1] = new OutfitFactory(undefined, resJSON)
  })

  test('PUT /outfits: should update newly created item', async () => {
    const testOutfit2 = new PartialOutfitFactory(2)
    const res = await app.request(`/api/outfits/${testOutfits[1].id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...testOutfit2,
        itemIdsTypes: testItems.map((item, i) => ({
          id: item.id,
          itemType: itemTypeEnum[(i + 2) % 5],
        })),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as OutfitAPI
    expect(resJSON).toMatchObject(testOutfit2.formatAPI())
    testOutfits[1] = new OutfitFactory(undefined, resJSON)
  })

  test('DELETE /outfits: should delete seeded outfit', async () => {
    const res = await app.request(`/api/outfits/${testOutfits[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as OutfitAPI
    expect(resJSON).toMatchObject(testOutfits[0].formatAPI())
    testOutfits.splice(0, 1)
  })
})
