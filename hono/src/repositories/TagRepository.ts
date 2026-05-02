import { and, eq } from 'drizzle-orm'

import { tag } from '../schema'
import type { Database } from '../utils/inject-services'
import { createLogger } from '../utils/logger'
import type { PaginationInput, PaginationResult } from '../utils/pagination'
import { createPaginationResult } from '../utils/pagination'

const logger = createLogger('TagRepository')

export class TagRepository {
  constructor(private db: Database) {}

  /**
   * Find all tags for a user with pagination.
   *
   * @param {string} userId — The user's ID
   * @param {PaginationInput} pagination — Pagination options
   * @returns {Promise<PaginationResult<typeof tag.$inferSelect>>} — Promise resolving to paginated tags
   */
  async findAll(
    userId: string,
    pagination?: PaginationInput
  ): Promise<PaginationResult<typeof tag.$inferSelect>> {
    logger.debug('Finding all tags for user', {
      userId,
      offset: pagination?.offset ?? 'all',
      limit: pagination?.limit ?? 'all',
    })

    // If pagination provided, use offset/limit, otherwise fetch all
    const offset = pagination?.offset ?? 0
    const limit = pagination?.limit ? pagination.limit + 1 : undefined

    const result = await this.db.query.tag.findMany({
      where: eq(tag.userId, userId),
      orderBy: (tags, { asc }) => [asc(tags.name)],
      ...(limit && { offset, limit }),
    })

    logger.debug('Tags retrieved successfully', {
      userId,
      tagCount: result.length,
    })

    return createPaginationResult(result, pagination)
  }

  /**
   * Create a new tag for a user.
   *
   * @param {string} userId — The user's ID
   * @param {Omit<typeof tag.$inferInsert, 'id' | 'createdAt' | 'userId'>} data — The tag data to create
   * @returns {Promise<typeof tag.$inferSelect>} — Promise resolving to the created tag
   */
  async create(
    userId: string,
    data: Omit<typeof tag.$inferInsert, 'id' | 'createdAt' | 'userId'>
  ): Promise<typeof tag.$inferSelect> {
    logger.info('Creating new tag', { userId, data })

    const result = (
      await this.db
        .insert(tag)
        .values({
          ...data,
          userId,
        })
        .returning()
    )[0]

    logger.info('Tag created successfully', {
      userId,
      tagId: result.id,
    })
    return result
  }

  /**
   * Update an existing tag for a user.
   *
   * @param {string} userId — The user's ID
   * @param {string} tagId — The ID of the tag to update
   * @param {Partial<Omit<typeof tag.$inferInsert, 'id' | 'createdAt' | 'userId'>>} data — The tag data to update
   * @returns {Promise<typeof tag.$inferSelect>} — Promise resolving to the updated tag
   */
  async update(
    userId: string,
    tagId: string,
    data: Partial<Omit<typeof tag.$inferInsert, 'id' | 'createdAt' | 'userId'>>
  ): Promise<typeof tag.$inferSelect> {
    logger.info('Updating tag', { userId, tagId, data })

    const result = (
      await this.db
        .update(tag)
        .set(data)
        .where(and(eq(tag.id, tagId), eq(tag.userId, userId)))
        .returning()
    )[0]

    logger.info('Tag updated successfully', { userId, tagId })
    return result
  }

  /**
   * Delete a tag for a user.
   *
   * @param {string} userId — The user's ID
   * @param {string} tagId — The ID of the tag to delete
   * @returns {Promise<typeof tag.$inferSelect>} — Promise resolving to the deleted tag
   */
  async delete(
    userId: string,
    tagId: string
  ): Promise<typeof tag.$inferSelect> {
    logger.info('Deleting tag', { userId, tagId })

    const result = (
      await this.db
        .delete(tag)
        .where(and(eq(tag.id, tagId), eq(tag.userId, userId)))
        .returning()
    )[0]

    logger.info('Tag deleted successfully', { userId, tagId })
    return result
  }
}
