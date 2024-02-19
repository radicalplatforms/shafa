import { Client } from '@neondatabase/serverless'
import type { PgRemoteDatabase } from 'drizzle-orm/pg-proxy'
import { drizzle } from 'drizzle-orm/pg-proxy'
import type { Context } from 'hono'
import { env } from 'hono/adapter'
import { newDb } from 'pg-mem'
import * as schema from '../../schema'

export type Variables = {
  db: PgRemoteDatabase<typeof schema>
}

export default async function injectDB(c: Context, next: Function) {
  const { Client } = newDb().adapters.createPg()
  const client = new Client()
  const db = drizzle(
    async (sql, params, method) => {
      const sqlBody = sql.replace(/;/g, '')
      const result = await client.query({
        text: sqlBody,
        values: params,
        rowMode: method === 'all' ? 'array' : undefined,
      })
      return { rows: result.rows }
    },
    { schema }
  )
  c.set('db', db)
  await client.connect()
  await next()
  await client.end()
}
