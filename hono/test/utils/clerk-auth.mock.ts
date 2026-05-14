import type { Context, MiddlewareHandler } from 'hono'

export const clerkMiddleware = (): MiddlewareHandler => async (_c, next) => {
  await next()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getAuth = (_c: Context) => null
