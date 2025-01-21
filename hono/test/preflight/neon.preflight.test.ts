import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

import preflightTest from './preflight.test'

/**
 * Neon Preflight Tests
 *
 * WARNING (HIGHER DB COSTS): These tests will be run against a fork of the
 * production database. Please be concise and frugal with database manipulations
 * as we will be billed for each query.
 *
 * This Neon configuration should support a run of "preflightTest()" against
 * a remote Neon database. The DATABASE_URL env should be supplied on the
 * command line.
 */

// Neon Config: Set Node.js Websocket Driver
// https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined
neonConfig.webSocketConstructor = ws

preflightTest().then()
