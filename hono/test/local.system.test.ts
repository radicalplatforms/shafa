import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import * as schema from '../src/schema'
import { itemsTest } from './system.test'
import { clean, provision } from './utils/db'

/**
 * System Tests (Source)
 *
 * WARNING (HIGHER DB COSTS): These tests will be run against a fork of the
 * production database. Please be concise and frugal with database manipulations
 * as we will be billed for each query.
 *
 * This module contains tests regarding the functionality of the whole system.
 * These tests aim to validate that the integration and interaction of all
 * system components are functioning as expected. For example, in a wardrobe
 * logging app, you'd test account creation, creating items, logging outfits,
 * changing settings, and other misc actions.
 *
 * No database mocking, cleaning, seeding, or teardown actions should be
 * present in each individual system test. Pretend as if you are a legitimate
 * user that is manipulating data on a production system. Destroy any data that
 * would prevent a subsequent system test run from passing.
 */

const DB_NAME = 'system_test'

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

afterAll(async () => {
  await clean(DB_NAME)
})

itemsTest()
