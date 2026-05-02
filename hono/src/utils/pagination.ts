import { z } from 'zod'

/**
 * Pagination input schema for query parameters (strings coerced to numbers).
 * If not provided, defaults to fetching all records (no pagination).
 */
export const PaginationInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type PaginationInput = z.infer<typeof PaginationInputSchema>

/**
 * Pagination result using limit + 1 pattern
 */
export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Create pagination result using limit + 1 pattern.
 * If pagination is not provided, returns all results without pagination metadata.
 *
 * @param results - Query results (should fetch limit + 1 when paginated)
 * @param input - Pagination input (optional)
 * @returns Pagination result
 */
export function createPaginationResult<T>(
  results: T[],
  input?: PaginationInput
): PaginationResult<T> {
  // If no pagination provided, return all results
  if (!input?.limit) {
    return {
      data: results,
      pagination: {
        page: 0,
        limit: results.length,
        hasNext: false,
        hasPrev: false,
      },
    }
  }

  const offset = input.offset ?? 0
  const limit = input.limit
  const page = limit > 0 ? Math.floor(offset / limit) : 0
  const hasMore = results.length > limit

  // Remove the extra item if we fetched limit + 1
  const data = hasMore ? results.slice(0, limit) : results

  return {
    data,
    pagination: {
      page,
      limit,
      hasNext: hasMore,
      hasPrev: offset > 0,
    },
  }
}
