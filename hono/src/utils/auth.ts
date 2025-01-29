import { getAuth } from '@hono/clerk-auth'
import type { Context } from 'hono'

export async function requireAuth(c: Context, next: Function) {
  const auth = getAuth(c)

  if (!auth?.userId) {
    return c.json({ message: 'Unauthorized: You must be logged in' }, 401)
  }

  await next()
}
