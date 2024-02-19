import app from '../src/index'
import type { items } from '../src/schema'
import { validItem } from './factory/items'
import { startPostgres, stopPostgres } from './utils/db'

jest.mock('../src/utils/injectDB')

describe('Items Unit Test', () => {
  beforeAll(async () => startPostgres())
  afterAll(async () => stopPostgres())

  test('GET /items: should return no items', async () => {
    const res = await app.request('/api/items')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test('POST /items: should create and return one item', async () => {
    const res = await app.request('/api/items', {
      method: 'POST',
      body: JSON.stringify(validItem()),
      headers: { 'Content-Type': 'application/json' },
    })
    const json = (await res.json()) as (typeof items)[]
    expect(res.status).toBe(200)
    expect(json).toMatchObject([validItem()])
  })
})
