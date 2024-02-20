//import app from '../src/index'
//import { seededOutfitsSimple } from './factory/outfits'
//import { createDbAndMigrate, seed } from './utils/db'
//import injectDBMock from './utils/injectDBMock'
//
//const DB_NAME = 'outfits_test'
//
//jest.mock('../src/utils/injectDB', () => injectDBMock(DB_NAME))
//
//beforeAll(async () => {
//  await createDbAndMigrate(DB_NAME)
//})
//
//describe('Outfits: No Seeding', () => {
//  test('GET /outfits: should return no outfits', async () => {
//    const res = await app.request('/api/outfits')
//    expect(res.status).toBe(200)
//    expect(await res.json()).toEqual([])
//  })
//})
//
//describe('Outfits: Seeded [items-simple, outfits-simple]', () => {
//  beforeAll(async () => {
//    await seed(DB_NAME, 5555, 16, ['items-simple.sql', 'outfits-simple.sql'])
//  })
//
//  test('GET /outfits: should return 1 seeded outfit with items', async () => {
//    const res = await app.request('/api/outfits')
//    expect(res.status).toBe(200)
//    expect(await res.json()).toEqual(seededOutfitsSimple())
//  })
//})
