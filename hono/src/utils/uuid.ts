import { createId, isCuid } from '@paralleldrive/cuid2'

/**
 * Generate a unique UUID for use across the application.
 * Uses CUID2 for consistent ID generation in both database and UI messages.
 *
 * @returns {string} - Unique UUID
 */
export function generateUUID(): string {
  return createId()
}

/**
 * Validate that a string is a valid CUID2 UUID.
 * Can be used with z.string().refine(isValidUUID) for Zod schema validation.
 *
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if the ID is valid, false otherwise
 */
export function isValidUUID(id: string): boolean {
  return isCuid(id)
}

