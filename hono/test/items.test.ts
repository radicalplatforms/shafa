import { execSync } from 'child_process'
import type { UnstableDevWorker } from 'wrangler'
import { unstable_dev } from 'wrangler'

const POST_ITEM_ONE = {
  name: 'Vintage Denim Pants',
  brand: 'Levi',
  photo: 'https://example.com/',
  type: 0,
  rating: 2,
  quality: 4,
  authorUsername: 'rak3rman',
}

describe('GET /items', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./src/index.ts', {
      experimental: {
        disableExperimentalWarning: true,
        d1Databases: [
          {
            binding: 'DB',
            database_name: 'test-shafa-hono-db',
            database_id: '6e3f30c1-e1f8-4060-b0d3-8c733a1a8dd4',
            migrations_dir: './drizzle',
          },
        ],
      },
      env: 'test',
      persistTo: './test/drizzle-test',
    })
  })

  afterAll(async () => {
    await execSync(
      `wrangler d1 execute test-shafa-hono-db --local --env test --file=./test/drizzle-test/cleanup-test-db.sql --persist-to=./test/drizzle-test`
    )
    await worker.stop()
  })

  test('should return no items', async () => {
    const res = await worker.fetch('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test('POST /posts', async () => {
    const res = await worker.fetch('/api/items', {
      method: 'POST',
      body: JSON.stringify(POST_ITEM_ONE),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject([POST_ITEM_ONE])
  })
})
