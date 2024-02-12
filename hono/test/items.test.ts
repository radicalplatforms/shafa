import type { UnstableDevWorker } from 'wrangler'
import { unstable_dev } from 'wrangler'

describe('GET /items', () => {
  let worker: UnstableDevWorker

  beforeAll(async () => {
    worker = await unstable_dev('./src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    })
  })

  afterAll(async () => {
    await worker.stop()
  })

  test('should return no items', async () => {
    const res = await worker.fetch('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})