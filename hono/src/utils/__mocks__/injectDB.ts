import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import * as schema from '../../schema'

export type Variables = {
  db: PostgresJsDatabase<typeof schema>
}

export default async function injectDB(c: Context, next: Function) {
  const queryClient = postgres('postgres://localhost:5555/postgres')
  const db = drizzle(queryClient, { schema })
  c.set('db', db)
  await next()
}
