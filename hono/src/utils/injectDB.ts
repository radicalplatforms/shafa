import { Client } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import type { NeonDatabase } from 'drizzle-orm/neon-serverless'
import type { Context } from 'hono'
import type * as schema from '../schema'

export type Variables = {
  db: NeonDatabase<typeof schema>
}

export default async function injectDB(c: Context, next: Function) {
  const client = new Client(c.env.DATABASE_URL)
  c.set('db', drizzle(client))
  //  await client.connect()
  await next()
  //  await client.end()
}
