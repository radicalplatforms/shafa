import { getAuth } from '@hono/clerk-auth'
import type { Context } from 'hono'
import { env } from 'hono/adapter'

export type AuthVariables = {
  auth: ReturnType<typeof getAuth>
}

export async function requireAuth(c: Context, next: Function) {
  const { DEV_AUTH_BYPASS_USER_ID } = env<{ DEV_AUTH_BYPASS_USER_ID?: string }>(c)

  // In development, if DEV_AUTH_BYPASS_USER_ID is set, bypass auth and use that user ID
  if (DEV_AUTH_BYPASS_USER_ID) {
    const mockAuth = {
      sessionClaims: null,
      sessionId: null,
      userId: DEV_AUTH_BYPASS_USER_ID,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      orgPermissions: null,
      factorVerificationAge: null,
      getToken: () => Promise.resolve(''),
      has: () => false,
      debug: () => {},
    }
    c.set('auth', mockAuth)
  } else {
    // In production, use the auth middleware
    const auth = getAuth(c)
    c.set('auth', auth)

    if (!auth?.userId) {
      return c.json({ message: 'Unauthorized: You must be logged in' }, 401)
    }
  }

  await next()
}
