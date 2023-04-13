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
import faunadb, { Call, query as q } from 'faunadb'
import { Bindings } from 'hono/dist/types/types'
const { Paginate, Match, Index, Lambda, Get, Var, Map } = q;

const app = new Hono<{ Bindings: Bindings }>()
const client = new faunadb.Client({ secret: 'fnAFBYEXE-AAUG-ngNcv0DP_Qs36eKVqCi3zBrLc' })

app.use('*', logger())
app.use('*', prettyJSON())

app.get('/', (c) => c.text('Shafa API v1.0.0'))

// Retrieve all items in items collection
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
        
// Add a new item to the items collection
type Item = {
    user_id: string,
    uuid: string,
    desc: string,
    brand: string,
    photo: string,
    primaryColor: string,
    pattern: string,
    type: string,
    subtype: string,
    style: string,
    rating: number,
    quality: number
};
app.post('/createItem', async (c) => {
    try {
        console.log("hello world.")
        // Convert the request body to a JSON object
        const item: Item = JSON.parse(c.req.body.toString());
        const result = await client.query(Call(Function('addNewItem'), 
            item.user_id, 
            item.desc, 
            item.brand, 
            item.photo, 
            item.primaryColor, 
            item.pattern, 
            item.type, 
            item.subtype, 
            item.style, 
            item.rating, 
            item.quality
        ));
        return c.json({ data: result });
    } catch (error) {
        console.error(error);
        return c.text('Error occurred');
    }
});

export default app