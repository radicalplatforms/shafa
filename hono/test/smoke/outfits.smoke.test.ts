import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'

import app from '../../src/index'
import * as schema from '../../src/schema'
import { itemTypeEnum } from '../../src/schema'
import { clean, provision } from '../utils/db'
import type { ItemFactory } from '../utils/factory/items'
import type { ItemToOutfitFactory } from '../utils/factory/items-outfits'
import type { OutfitSuggestionAPI } from '../utils/factory/outfits'
import { type OutfitAPI, OutfitFactory, PartialOutfitFactory } from '../utils/factory/outfits'
import type { TagFactory } from '../utils/factory/tags'
import type { TagToItemFactory } from '../utils/factory/tags-items'
import type { TagToOutfitFactory } from '../utils/factory/tags-outfits'
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
    expect(await res.json()).toEqual({ outfits: [], last_page: true })
  })

  // NOTE: No additional testing here since POST /api/outfits requires items
  //       to map an outfit to, see seeded tests below
})

describe('[Smoke] Outfits: Seeded [basic-small-seed]', () => {
  let testItems: ItemFactory[]
  let testOutfits: OutfitFactory[]
  let testItemsToOutfits: ItemToOutfitFactory[]
  let testTags: TagFactory[]
  let testTagsToItems: TagToItemFactory[]
  let testTagsToOutfits: TagToOutfitFactory[]

  beforeAll(async () => {
    ;[testItems, testOutfits, testItemsToOutfits, testTags, testTagsToItems, testTagsToOutfits] =
      await basicSmallSeed(DB_NAME, DB_PORT)
  })

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('GET /outfits: should return 1 seeded outfit with items', async () => {
    const res = await app.request('/api/outfits')
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as { outfits: OutfitAPI[]; last_page: boolean }
    expect(resJSON.outfits).toEqual(
      testOutfits.map((outfit) => ({
        ...outfit.formatAPI(),
        itemsToOutfits: testItemsToOutfits
          .filter((itemToOutfit) => itemToOutfit.outfitId === outfit.id)
          .map((itemToOutfit) => ({
            itemType: itemToOutfit.itemType,
            item: testItems
              .find((item) => itemToOutfit.itemId === item.id)
              ?.formatAPI({ omitLastWornAt: true }),
          })),
        tagsToOutfits: testTagsToOutfits
          .filter((tagToOutfit) => tagToOutfit.outfitId === outfit.id)
          .map((tagToOutfit) => ({
            status: tagToOutfit.status,
            tag: testTags.find((tag) => tagToOutfit.tagId === tag.id)?.formatAPI(),
          })),
      }))
    )
    expect(resJSON.last_page).toEqual(true)
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
        tagIds: [testTags[0].id],
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
        tagIds: [testTags[1].id],
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

  test('GET /outfits/suggest: should return outfit suggestions with scores', async () => {
    const res = await app.request('/api/outfits/suggest')
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as {
      suggestions: OutfitSuggestionAPI[]
      generated_at: Date
      metadata: {
        wardrobe_size: number
        recency_threshold: number
        last_page: boolean
      }
    }
    expect(Array.isArray(resJSON.suggestions)).toBe(true)

    // Validate scoring details structure and types
    const scoringDetails = resJSON.suggestions[0].scoring_details
    expect(scoringDetails).toBeDefined()

    // Validate score values match expected ranges and types
    expect(scoringDetails.base_score).toBeGreaterThanOrEqual(0)
    expect(scoringDetails.base_score).toBeLessThanOrEqual(60) // Max rating (4) * 15

    expect(scoringDetails.items_score).toBeGreaterThanOrEqual(0)
    expect(scoringDetails.items_score).toBeLessThanOrEqual(32) // Max rating (4) * 8

    expect(scoringDetails.time_factor).toBeGreaterThanOrEqual(0)
    expect(scoringDetails.time_factor).toBeLessThanOrEqual(20)

    expect(scoringDetails.frequency_score).toBeGreaterThanOrEqual(0)
    expect(scoringDetails.frequency_score).toBeLessThanOrEqual(20) // Never worn bonus

    expect(scoringDetails.day_of_week_score).toBeGreaterThanOrEqual(0)
    expect(scoringDetails.day_of_week_score).toBeLessThanOrEqual(15) // Max confidence * 15

    expect(scoringDetails.seasonal_score).toBeGreaterThanOrEqual(0)
    expect(scoringDetails.seasonal_score).toBeLessThanOrEqual(15) // Max seasonal relevance * 15

    // Validate total score is sum of all components
    expect(scoringDetails.total_score).toBe(
      scoringDetails.base_score +
        scoringDetails.items_score +
        scoringDetails.time_factor +
        scoringDetails.frequency_score +
        scoringDetails.day_of_week_score +
        scoringDetails.seasonal_score
    )

    // Validate raw data structure and types
    const rawData = scoringDetails.raw_data
    expect(rawData).toBeDefined()

    expect(Number.isInteger(rawData.wear_count)).toBe(true)
    expect(rawData.wear_count).toBeGreaterThanOrEqual(0)

    expect(Number.isInteger(rawData.days_since_worn)).toBe(true)
    expect(rawData.days_since_worn).toBeGreaterThanOrEqual(0)

    expect(Number.isInteger(rawData.same_day_count)).toBe(true)
    expect(rawData.same_day_count).toBeGreaterThanOrEqual(0)

    expect(typeof rawData.seasonal_relevance).toBe('number')
    expect(rawData.seasonal_relevance).toBeGreaterThanOrEqual(0)
    expect(rawData.seasonal_relevance).toBeLessThanOrEqual(1)

    expect(Number.isInteger(rawData.recently_worn_items)).toBe(true)
    expect(rawData.recently_worn_items).toBeGreaterThanOrEqual(0)

    expect(Array.isArray(rawData.core_items)).toBe(true)
    rawData.core_items.forEach((item) => {
      expect(typeof item).toBe('string')
      expect(item.length).toBe(24) // CUID length
    })

    expect(resJSON.generated_at).toBeDefined()
    expect(resJSON.metadata.wardrobe_size).toEqual(5)
    expect(resJSON.metadata.recency_threshold).toEqual(1)
    expect(resJSON.metadata.last_page).toBeTruthy()
  })
})
