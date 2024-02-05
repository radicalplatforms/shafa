import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import type { Context } from 'hono'
import * as schema from '../schema'

export type Bindings = {
  DB: D1Database
}

export type Variables = {
  db: DrizzleD1Database<typeof schema>
}

export default async function injectDB(c: Context, next: Function) {
  const drizzleDB = drizzle(c.env.DB, { schema })
  c.set('db', drizzleDB)
  await next()
}
