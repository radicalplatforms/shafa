import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'

import app from '../../src/index'
import * as schema from '../../src/schema'
import { clean, provision } from '../utils/db'
import type { TagAPI } from '../utils/factory/tags'
import { PartialTagFactory, TagFactory } from '../utils/factory/tags'

/**
 * Tags Smoke Tests
 *
 * Smoke testing, also known as 'build verification testing', is a type of
 * software testing that comprises a non-exhaustive set of tests that aim at
 * ensuring that the most critical functions work. The result of this testing is
 * used to decide if a build is stable enough to proceed with further testing.
 *
 * Here we are testing the set of "tags" APIs in a non-exhaustive way. A good
 * guideline is to hit every endpoint and not dig deep into edge cases.
 */

const DB_NAME = 'tags_smoke_test'
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

describe('[Smoke] Tags: simple test on each endpoint, no seeding', () => {
  const testTags: TagFactory[] = []

  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('GET /tags: should return no tags', async () => {
    const res = await app.request('/api/tags')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ tags: [] })
  })

  test('POST /tags: should create and return one tag', async () => {
    const testPartialTag1 = new PartialTagFactory(1)
    const res = await app.request('/api/tags', {
      method: 'POST',
      body: JSON.stringify(testPartialTag1),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as TagAPI
    expect(resJSON).toMatchObject(testPartialTag1.formatAPI())
    testTags[0] = new TagFactory(undefined, resJSON)
  })

  test('GET /tags: should return created tag', async () => {
    const res = await app.request(`/api/tags`)
    const resJSON = (await res.json()) as { tags: TagAPI[] }
    expect(resJSON.tags).toMatchObject([testTags[0].formatAPI()])
  })

  test('PUT /tags: should update existing tag', async () => {
    const testPartialTag2 = new PartialTagFactory(2)
    const res = await app.request(`/api/tags/${testTags[0].id}`, {
      method: 'PUT',
      body: JSON.stringify(testPartialTag2),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as TagAPI
    expect(resJSON).toMatchObject(testPartialTag2.formatAPI())
    testTags[0] = new TagFactory(undefined, resJSON)
  })

  test('GET /tags: should return updated tag', async () => {
    const res = await app.request(`/api/tags`)
    const resJSON = (await res.json()) as { tags: TagAPI[] }
    expect(resJSON.tags).toMatchObject([testTags[0].formatAPI()])
  })

  test('DELETE /tags: should delete existing tag', async () => {
    const res = await app.request(`/api/tags/${testTags[0].id}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const resJSON = (await res.json()) as { tags: TagAPI[] }
    expect(resJSON).toMatchObject(testTags[0].formatAPI())
    testTags.splice(0, 1)
  })
})
