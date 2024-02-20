import { execSync } from 'child_process'
import type { UnstableDevWorker } from 'wrangler'
import { unstable_dev } from 'wrangler'
import type { items } from '../src/schema'
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
      persistTo: './test/tmp-d1-db',
    })
  })

  afterAll(async () => {
    execSync(`npm run wrtest-clean-db-local`)
    await worker.stop()
  })

  test('GET /items: should return no items', async () => {
    const res = await worker.fetch('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test('POST /items: should error when create invalid item', async () => {
  })

  test('POST /items: should create and return one item', async () => {
    const res = await worker.fetch('/api/items', {
      method: 'POST',
      body: JSON.stringify(validItem()),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = (await res.json()) as (typeof items)[]
    expect(res.status).toBe(200)
    expect(json).toMatchObject([validItem()])
    expect(json[0].id).toEqual(1)
  })

  test('POST /items: should create single item when creating duplicates', async () => {
  })

  test('POST /items: should create multiple and return items', async () => {
  })

  // TODO ADD GET FILTERs HERE AFTER POSTING
  // test('GET /items: ', async () => {
  // })

  test('PUT /items: should error when updating invalid item', async () => {
  })

  test('PUT /items: should update one item', async () => {
  })

  // TODO ADD GET FILTERs HERE AFTER PUTTING
  // test('GET /items: ', async () => {
  // })

  test('DELETE /items: should delete one item', async () => {
  })

  test('GET /items: should return empty for deleted item', async () => {
  })

  test('DELETE /items: should delete multiple items', async () => {
  })
})
