import { enableFetchMocks } from 'jest-fetch-mock'
enableFetchMocks();
import app from '../src/index'

jest.mock('drizzle-orm/d1', () => ({
  drizzle: jest.fn().mockImplementation(() => ({
    fetch: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue([]),
  })),
}))

const MOCK_ENV = {
  DB: {},
};

describe('GET /items', () => {
  it('should return no items', async () => {
    const res = await app.request('/api/items', {}, MOCK_ENV)
    console.log(res)
    expect(await res.json()).toEqual([])
    expect(res.status).toBe(200)

    const mockDrizzle = require('drizzle-orm/d1').drizzle()
    expect(mockDrizzle.query).toHaveBeenCalled()
  })
})

