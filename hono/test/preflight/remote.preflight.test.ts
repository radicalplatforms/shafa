import preflightTest from './preflight.test'

/**
 * Remote Preflight Tests
 *
 * WARNING (HIGHER DB COSTS): These tests will be run against a fork of the
 * production database (and a billable Cloudflare worker instance). Please be
 * concise and frugal with database manipulations as we will be billed for each
 * query.
 *
 * This Remote configuration should support a run of "preflightTest()" against
 * a fully remote instance of the hono backend coupled with a remote Neon
 * database instance. Additional work will be required here to hit all
 * endpoints on a remote resource.
 */

// TODO: Add harnessing to support testing on a remote instance of hono

preflightTest().then()
