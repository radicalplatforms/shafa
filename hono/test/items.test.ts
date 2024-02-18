import { execSync } from 'child_process'
import type { UnstableDevWorker } from 'wrangler'
import { unstable_dev } from 'wrangler'
import app from '../src/index'
import type { items } from '../src/schema'
import { validItem } from './factory/items'

jest.mock('../src/utils/injectDB')

describe('Items Unit Test', () => {
  //  let worker: UnstableDevWorker
  //
  //  beforeAll(async () => {
  //    worker = await unstable_dev('./src/index.ts', {
  //      env: 'test',
  //      experimental: {
  //        disableExperimentalWarning: true,
  //      },
  //      ip: '127.0.0.1',
  //      persistTo: './test/tmp-d1-db',
  //    })
  //  })
  //
  //  afterAll(async () => {
  //    execSync(`npm run wrtest-clean-db-local`)
  //    await worker.stop()
  //  })

  test('GET /items: should return no items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  //  test('POST /items: should create and return one item', async () => {
  //    const res = await worker.fetch('/api/items', {
  //      method: 'POST',
  //      body: JSON.stringify(validItem()),
  //      headers: { 'Content-Type': 'application/json' },
  //    })
  //    const json = (await res.json()) as (typeof items)[]
  //    expect(res.status).toBe(200)
  //    expect(json).toMatchObject([validItem()])
  //    expect(json[0].id).toEqual(1)
  //  })
})
