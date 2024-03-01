import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import * as schema from '../../src/schema'
import { clean, provision } from '../utils/db'

/**
 * Outfits Unit Tests
 *
 * Unit testing is a method of software testing where individual components of
 * a program are tested to ensure they work correctly. The intention is to
 * isolate each part of the program and verify its functionality. It helps to
 * detect and fix bugs early in the development stage.
 *
 * Here we are testing the set of "outfits" APIs in an exhaustive way. We want
 * to find and test every edge case (as well as common cases) for each method.
 */

const DB_NAME = 'outfits_unit_test'
const DB_URL = `postgres://localhost:5555/${DB_NAME}`

// NOTE: Beware of jest hoisting!
//       .mock() will be automatically hoisted to the top of the code block,
//       because of this function decomposition is not possible without overhead
jest.mock('../../src/utils/inject-db', () => {
  const originalModule = jest.requireActual('../../src/utils/inject-db')
  return {
    __esModule: true,
    ...originalModule,
    default: async (c: Context, next: Function) => {
      c.set('db', drizzle(postgres(DB_URL), { schema }))
      await next()
    },
  }
})

beforeAll(async () => {
  await provision(DB_NAME)
})

describe('[Unit] Outfits: GET /outfits', () => {
  afterAll(async () => {
    await clean(DB_NAME)
  })

  test('TODO', async () => {
    // TODO
    expect(1).toEqual(1)
  })
})
