import type { UIMessage } from 'ai'
import { eq, sql } from 'drizzle-orm'

import { agentMessage, agentConversation } from '../schema'
import type { Database } from '../utils/inject-services'
import { HTTPError } from '../utils/http-error'
import { createLogger } from '../utils/logger'

const logger = createLogger('MessageRepository')

export class MessageRepository {
  constructor(private db: Database) {}

  /**
   * Get the leaf message ID for the active conversation path.
   *
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<string | null>} - The leaf message ID or null if no active path exists
   */
  async getActivePathLeaf(
    conversationId: string
  ): Promise<string | null> {
    const conversation = await this.db.query.agentConversation.findFirst({
      where: eq(agentConversation.id, conversationId),
    })

    if (!conversation) {
      return null
    }

    return conversation.leafMessageId
  }

  /**
   * Update the active path leaf message for a conversation.
   *
   * @param {string} conversationId - The conversation ID
   * @param {string} leafMessageId - The new leaf message ID
   * @returns {Promise<void>}
   */
  async updateActivePathLeaf(
    conversationId: string,
    leafMessageId: string
  ): Promise<void> {
    await this.db
      .update(agentConversation)
      .set({
        leafMessageId,
        updatedAt: new Date(),
      })
      .where(eq(agentConversation.id, conversationId))
  }

  /**
   * Find all messages in the active conversation path, ordered from root to leaf.
   *
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<typeof agentMessage.$inferSelect[]>} - Array of messages in the active path
   */
  async findActivePathMessages(
    conversationId: string
  ): Promise<typeof agentMessage.$inferSelect[]> {
    const leafMessageId = await this.getActivePathLeaf(conversationId)
    if (!leafMessageId) {
      return []
    }

    const result = await this.db.execute(
      sql`
        WITH RECURSIVE message_path AS (
          SELECT 
            id, conversation_id, parent_id, role, parts, metadata,
            model, usage, finish_reason, error, created_at,
            0 as depth
          FROM agent_message
          WHERE id = ${leafMessageId}
          
          UNION ALL
          
          SELECT 
            m.id, m.conversation_id, m.parent_id, m.role, m.parts, m.metadata,
            m.model, m.usage, m.finish_reason, m.error, m.created_at,
            mp.depth + 1
          FROM agent_message m
          INNER JOIN message_path mp ON m.id = mp.parent_id
        )
        SELECT 
          id, conversation_id as "conversationId", parent_id as "parentId",
          role, parts, metadata, model, usage,
          finish_reason as "finishReason", error, created_at as "createdAt"
        FROM message_path
        ORDER BY depth DESC
      `
    )

    const messages = result.rows as typeof agentMessage.$inferSelect[]
    return messages
  }

  /**
   * Find a message by ID.
   *
   * @param {string} messageId - The message ID
   * @returns {Promise<typeof agentMessage.$inferSelect | null>} - The message or null if not found
   */
  async findById(
    messageId: string
  ): Promise<typeof agentMessage.$inferSelect | null> {
    const result = await this.db.query.agentMessage.findFirst({
      where: eq(agentMessage.id, messageId),
    })

    return result ?? null
  }

  /**
   * Find all child messages of a given message.
   *
   * @param {string} messageId - The parent message ID
   * @returns {Promise<typeof agentMessage.$inferSelect[]>} - Array of child messages
   */
  async findChildren(
    messageId: string
  ): Promise<typeof agentMessage.$inferSelect[]> {
    const result = await this.db.query.agentMessage.findMany({
      where: eq(agentMessage.parentId, messageId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    })

    return result
  }

  /**
   * Create a new message in the conversation tree.
   *
   * @param {string} conversationId - The conversation ID
   * @param {UIMessage} message - The UIMessage to create
   * @param {string | null} parentId - The parent message ID, or null for root messages
   * @returns {Promise<typeof agentMessage.$inferSelect>} - The created message
   */
  async createMessage(
    conversationId: string,
    message: UIMessage,
    parentId: string | null = null
  ): Promise<typeof agentMessage.$inferSelect> {
    const conversation = await this.db.query.agentConversation.findFirst({
      where: eq(agentConversation.id, conversationId),
    })

    if (!conversation) {
      throw new HTTPError(404, `Conversation not found: ${conversationId}`)
    }

    const result = (
      await this.db
        .insert(agentMessage)
        .values({
          id: message.id,
          conversationId,
          parentId,
          role: message.role,
          parts: message.parts as any,
          metadata: message.metadata as any,
          model: conversation.model,
          finishReason: 'stop',
        })
        .returning()
    )[0]

    await this.updateActivePathLeaf(conversationId, result.id)

    return result
  }

  /**
   * Create an edit message as a sibling branch.
   *
   * @param {string} conversationId - The conversation ID
   * @param {string} originalMessageId - The message ID to edit
   * @param {UIMessage} newMessage - The new UIMessage for the edit
   * @returns {Promise<typeof agentMessage.$inferSelect>} - The created edit message
   */
  async createEditMessage(
    conversationId: string,
    originalMessageId: string,
    newMessage: UIMessage
  ): Promise<typeof agentMessage.$inferSelect> {
    const original = await this.findById(originalMessageId)
    if (!original) {
      throw new HTTPError(404, `Original message not found: ${originalMessageId}`)
    }

    if (original.conversationId !== conversationId) {
      throw new HTTPError(400, 'Message conversation mismatch')
    }

    if (original.role !== 'user') {
      throw new HTTPError(400, 'Can only edit user messages')
    }

    const conversation = await this.db.query.agentConversation.findFirst({
      where: eq(agentConversation.id, conversationId),
    })

    if (!conversation) {
      throw new HTTPError(404, `Conversation not found: ${conversationId}`)
    }

    const result = (
      await this.db
        .insert(agentMessage)
        .values({
          id: newMessage.id,
          conversationId,
          parentId: original.parentId,
          role: newMessage.role,
          parts: newMessage.parts as any,
          metadata: newMessage.metadata as any,
          model: conversation.model,
          finishReason: 'stop',
        })
        .returning()
    )[0]

    await this.updateActivePathLeaf(conversationId, result.id)

    return result
  }

  /**
   * Update an existing message with new content.
   *
   * @param {string} messageId - The message ID to update
   * @param {UIMessage} message - The updated UIMessage
   * @returns {Promise<void>}
   */
  async updateMessage(
    messageId: string,
    message: UIMessage
  ): Promise<void> {
    const existing = await this.findById(messageId)
    if (!existing) {
      throw new HTTPError(404, `Message not found: ${messageId}`)
    }

    await this.db
      .update(agentMessage)
      .set({
        parts: message.parts as any,
        metadata: message.metadata as any,
      })
      .where(eq(agentMessage.id, messageId))
  }
}
