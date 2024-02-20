import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import * as schema from '../src/schema'
import { clean, provision } from './utils/db'

/**
 * Outfits Functional Tests
 *
 * Functional testing is a type of software testing where the system is tested
 * against the functional requirements/specifications. Functions (or features)
 * are tested by feeding them input and examining the output. This type of
 * testing is not concerned with how processing occurs, but rather, with the
 * results of processing.
 *
 * Here we are testing the set of "outfits" APIs in an exhaustive way. We want
 * to find and test every edge case (as well as common cases) for each method.
 */

const DB_NAME = 'outfits_functional_test'

// NOTE: Beware of jest hoisting!
//       .mock() will be automatically hoisted to the top of the code block,
//       because of this function decomposition is not possible without overhead
jest.mock('../src/utils/injectDB', () => {
  const originalModule = jest.requireActual('../src/utils/injectDB')
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

describe('[Functional] Outfits: GET /outfits', () => {
  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('TODO', async () => {
    // TODO
    expect(1).toEqual(1)
  })
})
