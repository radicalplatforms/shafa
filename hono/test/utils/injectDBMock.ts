import { drizzle } from 'drizzle-orm/postgres-js'
import type { Context } from 'hono'
import postgres from 'postgres'
import * as schema from '../../src/schema'

export default function (DB_NAME: string) {
  const originalModule = jest.requireActual('../src/utils/injectDB')
  return {
    __esModule: true,
    ...originalModule,
    default: async (c: Context, next: Function) => {
      const url = `postgres://localhost:5555/${DB_NAME}`
      const queryClient = postgres(url)
      const db = drizzle(queryClient, { schema })
      c.set('db', db)
      await next()
    },
  }
}
