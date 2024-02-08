import app from '../src/index'

jest.mock('drizzle-orm/d1', () => ({
  drizzle: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({}),
    insert: jest.fn().mockResolvedValue({}),
  })),
}))

const MOCK_ENV = {
  DB: D1Database,
}

describe('GET /items', () => {
  it('should return no items', async () => {
    const res = await app.request('/items', {}, MOCK_ENV)
    expect(await res.json()).toEqual([])
    expect(res.status).toBe(200)

    const mockDrizzle = require('drizzle-orm/d1').drizzle()
    expect(mockDrizzle.query).toHaveBeenCalled()
  })
})
