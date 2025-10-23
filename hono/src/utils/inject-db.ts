import { Client } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import type { NeonDatabase } from 'drizzle-orm/neon-serverless'
import type { Context } from 'hono'
import { env } from 'hono/adapter'

import * as schema from '../schema'

export type DBVariables = {
  db: NeonDatabase<typeof schema>
  dbClient: Client
}

export default async function injectDB(c: Context, next: Function) {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c)

  const client = new Client(DATABASE_URL!)
  const db = drizzle(client, { schema })
  c.set('db', db)
  c.set('dbClient', client)

  try {
    await client.connect()
    await next()
  } finally {
    // Only close the connection if it's not being used by agent tools
    // The agent tools need the connection to remain open during execution
    if (!c.get('isAgentRequest')) {
      await client.end()
    }
  }
}
