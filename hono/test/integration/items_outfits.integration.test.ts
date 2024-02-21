import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import * as schema from '../../src/schema'
import { clean, provision } from '../utils/db'

/**
 * Items to Outfits, Integration Tests
 *
 * These tests go beyond unit tests by testing the interaction between various
 * parts of the system as a group. They focus on how different functions work
 * together, so we can ensure the entire process works as expected. This is the
 * place for testing database relationships, API calls that manipulate multiple
 * tables/databases, etc.
 */

const DB_NAME = 'items_outfits_integration_test'

// NOTE: Beware of jest hoisting!
//       .mock() will be automatically hoisted to the top of the code block,
//       because of this function decomposition is not possible without overhead
jest.mock('../../src/utils/injectDB', () => {
  const originalModule = jest.requireActual('../../src/utils/injectDB')
  return {
    __esModule: true,
    ...originalModule,
    default: async (c: Context, next: Function) => {
      c.set('db', drizzle(postgres(`postgres://localhost:5555/${DB_NAME}`), { schema }))
      await next()
    },
  }
})

beforeAll(async () => {
  await provision(DB_NAME)
})

describe('[Integration] Items: DELETE /items', () => {
  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('TODO', async () => {
    // TODO
    expect(1).toEqual(1)
  })
})
