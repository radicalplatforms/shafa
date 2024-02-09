import app from '../src/index'

interface Item {
  id?: number
  name: string
  brand: string
  photo: string
  type: number
  rating?: number
  quality?: number
  timestamp?: string
  authorUsername?: string
}

let inMemoryDB: Item[] = []

const MOCK_ENV = {
  DB: {
    prepare: () => ({
      bind: () => ({
        raw: async () => inMemoryDB,
        query: async () => inMemoryDB,
      }),
      query: async () => inMemoryDB,
    }),
    insert: (item: Item) => {
      inMemoryDB.push(item)
      return inMemoryDB
    },

    reset: () => {
      inMemoryDB = []
    },
  },
}

describe('GET /items', () => {
  beforeEach(() => {
    MOCK_ENV.DB.reset()
  })

  test('should return no items', async () => {
    const res = await app.request('/api/items', {}, MOCK_ENV)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})
