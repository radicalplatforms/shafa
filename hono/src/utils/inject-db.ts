import { Client } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import type { NeonDatabase } from 'drizzle-orm/neon-serverless'
import type { Context } from 'hono'
import { env } from 'hono/adapter'
import * as schema from '../schema'

export type Variables = {
  db: NeonDatabase<typeof schema>
}

export default async function injectDB(c: Context, next: Function) {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c)

  const client = new Client(DATABASE_URL!)
  const db = drizzle(client, { schema })
  c.set('db', db)

  await client.connect()
  await next()
  await client.end()
}
