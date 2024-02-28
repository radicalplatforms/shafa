import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import app from '../../src/index'
import type { outfits } from '../../src/schema'
import * as schema from '../../src/schema'
import { itemTypeEnum } from '../../src/schema'
import { clean, provision } from '../utils/db'
import type { ItemFactory } from '../utils/factory/items'
import type { ItemToOutfitFactory } from '../utils/factory/items-outfits'
import { OutfitFactory } from '../utils/factory/outfits'
import { PartialOutfitFactory } from '../utils/factory/outfits'
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
})

describe('[Smoke] Outfits: Seeded [basic-small-seed]', () => {
  let seededItems: ItemFactory[]
  let seededOutfits: OutfitFactory[]
  let seededItemsToOutfits: ItemToOutfitFactory[]

  beforeAll(async () => {
    ;[seededItems, seededOutfits, seededItemsToOutfits] = await basicSmallSeed(DB_URL)
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('GET /outfits: should return 1 seeded outfit with items', async () => {
    const res = await app.request('/api/outfits')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(
      seededOutfits.map((outfit) => ({
        ...outfit.formatAPI(),
        itemsToOutfits: seededItemsToOutfits
          .filter((itemToOutfit) => itemToOutfit.outfitId === outfit.id)
          .map((itemToOutfit) => ({
            itemType: itemToOutfit.itemType,
            item: seededItems.find((item) => itemToOutfit.itemId === item.id)?.formatAPI(),
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
        itemIdsTypes: seededItems.map((item, i) => ({
          id: item.id,
          itemType: itemTypeEnum[(i + 1) % 5],
        })),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as (typeof outfits)[]
    expect(json).toMatchObject([testOutfit1.formatAPI()])
    seededOutfits.push(new OutfitFactory(undefined, json[0]))
  })

  test('PUT /outfits: should update newly created item', async () => {
    const testOutfit2 = new PartialOutfitFactory(2)
    const res = await app.request(`/api/outfits/${seededOutfits[1].id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...testOutfit2,
        itemIdsTypes: seededItems.map((item, i) => ({
          id: item.id,
          itemType: itemTypeEnum[(i + 2) % 5],
        })),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as (typeof outfits)[]
    expect(json).toMatchObject([testOutfit2.formatAPI()])
    seededOutfits[1] = new OutfitFactory(undefined, json[0])
  })

  test('DELETE /outfits: should delete seeded outfit', async () => {
    const res = await app.request(`/api/outfits/${seededOutfits[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as (typeof outfits)[]
    expect(json).toMatchObject([seededOutfits[0].formatAPI()])
    seededOutfits.shift()
  })
})
