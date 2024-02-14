import { execSync } from 'child_process'
import type { UnstableDevWorker } from 'wrangler'
import { unstable_dev } from 'wrangler'
import { validItem } from './factory/items'

describe('Items Unit Test', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./src/index.ts', {
      env: 'test',
      experimental: {
        disableExperimentalWarning: true,
      },
      ip: '127.0.0.1',
      persistTo: './test/util/tmp-d1-db',
    })
  })

  afterAll(async () => {
    await execSync(`npm run db-clean`)
    await worker.stop()
  })

  test('GET /items: should return no items', async () => {
    const res = await worker.fetch('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test('POST /items: should create and return one item', async () => {
    const res = await worker.fetch('/api/items', {
      method: 'POST',
      body: JSON.stringify(validItem()),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject([validItem()])
  })
})
