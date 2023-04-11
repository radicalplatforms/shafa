/*
 * Shafa Hono.js Backend
 *
 * Wildhacks Demo Project, April 2023
 *
 * Radison Akerman, Leeza Andryushchenko
 * Richard Yang, Sengdao Inthavong
 */

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import * as jose from 'jose'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('*', prettyJSON())

app.get('/', (c) => c.text('Shafa API v1.0.0'))

export default app