import { getAuth } from '@hono/clerk-auth'
import type { Context } from 'hono'
import { env } from 'hono/adapter'

import { HTTPError } from './http-error'

/**
 * Type definition for Hono context variables containing authentication data.
 * Used to type the context in routes that require authentication.
 */
export type AuthVariables = {
  auth: ReturnType<typeof getAuth>
}

/**
 * Hono middleware that requires authentication for protected routes.
 * Validates that a user is authenticated and sets the auth object in the context.
 *
 * In development, if `DEV_AUTH_BYPASS_USER_ID` is set, bypasses authentication
 * and uses that user ID. In production, uses Clerk authentication.
 *
 * @param c - Hono context
 * @param next - Next middleware function
 * @throws {HTTPError} Throws 401 if user is not authenticated
 *
 * @example
 * ```ts
 * app.get('/protected', requireAuth, async (c) => {
 *   // User is authenticated here
 * })
 * ```
 */
export async function requireAuth(c: Context, next: Function) {
  const { DEV_AUTH_BYPASS_USER_ID } = env<{ DEV_AUTH_BYPASS_USER_ID?: string }>(
    c
  )

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
      throw new HTTPError(401, 'Unauthorized: You must be logged in')
    }
  }

  await next()
}

/**
 * Extracts and validates the user ID from the authenticated context.
 * Throws an error if the user ID is not available.
 *
 * @param c - Hono context with AuthVariables
 * @returns The authenticated user's ID
 * @throws {HTTPError} Throws 401 if user ID is not available
 *
 * @example
 * ```ts
 * const userId = getUserId(c)
 * const items = await itemService.items(userId)
 * ```
 */
export function getUserId<
  T extends { Variables: AuthVariables & Record<string, unknown> }
>(c: Context<T>): string {
  const auth = c.get('auth')
  if (!auth?.userId) {
    throw new HTTPError(401, 'Unauthorized: You must be logged in')
  }
  return auth.userId
}
