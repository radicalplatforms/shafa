import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import * as schema from '../../src/schema'
import { clean, provision } from '../utils/db'
import preflightTest from './preflight.test'

/**
 * Local Preflight Tests
 *
 * This Local configuration should support a run of "preflightTest()" against
 * a local database instance. Think of this test as the "preflight before the
 * preflight".
 */

const DB_NAME = 'local_preflight_test'

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

afterAll(async () => {
  await clean(DB_NAME)
})

preflightTest().then()