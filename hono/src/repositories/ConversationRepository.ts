import { and, eq, isNull } from 'drizzle-orm'

import { agentConversation, agentMessage } from '../schema'
import type { Database } from '../utils/inject-services'
import { HTTPError } from '../utils/http-error'
import { createLogger } from '../utils/logger'
import type { PaginationInput, PaginationResult } from '../utils/pagination'
import { createPaginationResult } from '../utils/pagination'

const logger = createLogger('ConversationRepository')

export class ConversationRepository {
  constructor(private db: Database) {}

  async findById(
    conversationId: string
  ): Promise<typeof agentConversation.$inferSelect | null> {
    const result = await this.db.query.agentConversation.findFirst({
      where: eq(agentConversation.id, conversationId),
    })

    return result ?? null
  }

  async findAll(
    userId: string,
    pagination?: PaginationInput
  ): Promise<PaginationResult<typeof agentConversation.$inferSelect>> {
    const offset = pagination?.offset ?? 0
    const limit = pagination?.limit ? pagination.limit + 1 : undefined

    const result = await this.db.query.agentConversation.findMany({
      where: and(
        eq(agentConversation.userId, userId),
        isNull(agentConversation.archivedAt)
      ),
      orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
      ...(limit && { offset, limit }),
    })

    return createPaginationResult(result, pagination)
  }

  async findByIdWithMessages(
    conversationId: string
  ): Promise<
    | (typeof agentConversation.$inferSelect & {
        messages: typeof agentMessage.$inferSelect[]
      })
    | null
  > {
    const conversation = await this.db.query.agentConversation.findFirst({
      where: eq(agentConversation.id, conversationId),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
      },
    })

    if (!conversation) {
      return null
    }

    return {
      ...conversation,
      messages: conversation.messages,
    }
  }

  async create(
    data: Omit<
      typeof agentConversation.$inferInsert,
      'id' | 'createdAt' | 'updatedAt'
    >
  ): Promise<typeof agentConversation.$inferSelect> {
    const result = (
      await this.db
        .insert(agentConversation)
        .values(data)
        .returning()
    )[0]

    return result
  }

  async updateTitle(
    conversationId: string,
    title: string
  ): Promise<typeof agentConversation.$inferSelect> {
    const result = (
      await this.db
        .update(agentConversation)
        .set({ title, updatedAt: new Date() })
        .where(eq(agentConversation.id, conversationId))
        .returning()
    )[0]

    return result
  }

  async update(
    conversationId: string,
    updates: Partial<
      Omit<
        typeof agentConversation.$inferInsert,
        'id' | 'createdAt' | 'updatedAt'
      >
    >
  ): Promise<typeof agentConversation.$inferSelect> {
    const result = (
      await this.db
        .update(agentConversation)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(agentConversation.id, conversationId))
        .returning()
    )[0]

    return result
  }

  async archive(
    conversationId: string
  ): Promise<typeof agentConversation.$inferSelect> {
    const result = (
      await this.db
        .update(agentConversation)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(agentConversation.id, conversationId))
        .returning()
    )[0]

    return result
  }

  /**
   * Get an existing conversation or create a new one.
   * If conversationId is provided, validates it exists.
   * If not provided, creates a new conversation with the default model.
   *
   * @param {string} userId - The user ID
   * @param {string} [conversationId] - Optional conversation ID to validate
   * @param {boolean} [throwIfNotFound=true] - Whether to throw if conversationId is provided but not found
   * @returns {Promise<string>} - The conversation ID
   */
  async getOrCreateConversation(
    userId: string,
    conversationId?: string,
    throwIfNotFound = true
  ): Promise<string> {
    if (conversationId) {
      const conversation = await this.findById(conversationId)
      if (!conversation) {
        if (throwIfNotFound) {
          throw new HTTPError(404, 'Conversation not found')
        }
        logger.warn(`Conversation not found, creating new [conv:${conversationId.slice(0, 8)} user:${userId.slice(0, 8)}]`)
      } else {
        return conversationId
      }
    }

    const model = process.env.AI_MEDIUM_MODEL
    if (!model) {
      throw new Error(
        'AI_MEDIUM_MODEL environment variable is required but not set'
      )
    }

    const conversation = await this.create({
      userId,
      model,
    })

    logger.debug(`New conversation created [conv:${conversation.id.slice(0, 8)} user:${userId.slice(0, 8)}]`)

    return conversation.id
  }
}

