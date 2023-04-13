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
import faunadb, { query as q } from 'faunadb'
const { Paginate, Match, Index, Lambda, Get, Var, Map } = q;

const app = new Hono<{ Bindings: Bindings }>()
const client = new faunadb.Client({ secret: 'fnAFBYEXE-AAUG-ngNcv0DP_Qs36eKVqCi3zBrLc' })

app.use('*', logger())
app.use('*', prettyJSON())

app.get('/', (c) => c.text('Shafa API v1.0.0'))

app.get('/items', async (c) => {
    try {
        const { data } = await client.query(
            Map(
                Paginate(Match(Index('allItems'))),
                Lambda('X', Get(Var('X')))
            )
        );
        return c.json(data);
    } catch (error) {
        console.error(error);
        return c.text('Error occurred');
    }
});


export default app