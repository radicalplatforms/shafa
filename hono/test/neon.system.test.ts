import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { itemsTest } from './system.test'

/**
 * System Tests (Neon)
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

// Neon Config: Set Node.js Websocket Driver
// https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined
neonConfig.webSocketConstructor = ws

itemsTest()
