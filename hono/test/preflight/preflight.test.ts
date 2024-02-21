import app from '../../src/index'

/**
 * Preflight Tests (Source)
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

export default async function preflightTest() {
  describe('[Preflight] Items: GET /items', () => {
    test('GET /items: should resolve', async () => {
      const res = await app.request('/api/items')
      expect(res.status).toBe(200)
    })
  })

  describe('[Preflight] Outfits: GET /outfits', () => {
    test('GET /outfits: should resolve', async () => {
      const res = await app.request('/api/outfits')
      expect(res.status).toBe(200)
    })
  })
}
