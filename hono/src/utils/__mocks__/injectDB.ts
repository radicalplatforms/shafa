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
      try {
        console.log('M1-3')
        const result = await client.query({
          text: sqlBody,
          values: params,
          rowMode: method === 'all' ? 'array' : undefined,
        })
        console.log('M2-3')
        console.log(result)
        return { rows: result.rows }
      } catch (e: any) {
        console.error('Error from pg proxy server: ', e.response.data)
        return { rows: [] }
      }
    },
    { schema }
  )
  c.set('db', db)
  await client.connect()
  console.log('M2')
  await next()
  console.log('M3')
  await client.end()
}
