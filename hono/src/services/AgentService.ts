import type { UIMessage } from 'ai'

import { executeAgentStream } from './agent/executor'
import type { StreamChunk } from './agent/executor'
import { generateUUID } from '../utils/uuid'
import type { ItemService } from './ItemService'
import type { OutfitService } from './OutfitService'
import type { MessageRepository } from '../repositories/MessageRepository'
import type { ConversationRepository } from '../repositories/ConversationRepository'
import { HTTPError } from '../utils/http-error'
import { createLogger } from '../utils/logger'
import type { PaginationInput, PaginationResult } from '../utils/pagination'
import { agentConversation, agentMessage } from '../schema'

const logger = createLogger('AgentService')

export class AgentService {
  constructor(
    private itemService: ItemService,
    private outfitService: OutfitService,
    private messageRepository: MessageRepository,
    private conversationRepository: ConversationRepository
  ) {}

  /**
   * Create a user message and execute agent stream.
   * Ensures conversation exists and loads history from database.
   *
   * @param {string} userId - The user ID
   * @param {string} text - The message text
   * @param {string} [conversationId] - Optional conversation ID
   * @returns {AsyncIterable<StreamChunk>} - Stream of chunks
   */
  async *createMessage(
    userId: string,
    text: string,
    conversationId?: string
  ): AsyncIterable<StreamChunk> {
    const messageText = text.trim()
    const preview = messageText.length > 50 
      ? messageText.slice(0, 50) + '...' 
      : messageText

    const resolvedConversationId =
      await this.conversationRepository.getOrCreateConversation(
        userId,
        conversationId
      )

    const userMessage: UIMessage = {
      id: generateUUID(),
      role: 'user',
      parts: [{ type: 'text', text: messageText }],
    }

    const parentId = await this.messageRepository.getActivePathLeaf(
      resolvedConversationId
    )
    const savedMessage = await this.messageRepository.createMessage(
      resolvedConversationId,
      userMessage,
      parentId
    )

    logger.info(`Inbound message "${preview}" [conv:${resolvedConversationId.slice(0, 8)} msg:${savedMessage.id.slice(0, 8)} user:${userId.slice(0, 8)}]`)

    yield* executeAgentStream({
      messageId: savedMessage.id,
      userId,
      itemService: this.itemService,
      outfitService: this.outfitService,
      messageRepository: this.messageRepository,
      conversationRepository: this.conversationRepository,
    })
  }

  /**
   * Retry an assistant message by re-executing from its parent.
   * Returns a stream for real-time updates.
   *
   * @param {string} userId - The user ID
   * @param {string} messageId - The assistant message ID to retry
   * @returns {AsyncIterable<StreamChunk>} - Stream of chunks
   */
  async *retryMessage(
    userId: string,
    messageId: string
  ): AsyncIterable<StreamChunk> {
    const originalMessage = await this.messageRepository.findById(messageId)
    if (!originalMessage) {
      throw new HTTPError(404, 'Message not found')
    }

    if (originalMessage.role !== 'assistant') {
      throw new HTTPError(400, 'Can only retry assistant messages')
    }

    logger.info(`Retry message [conv:${originalMessage.conversationId.slice(0, 8)} msg:${messageId.slice(0, 8)} user:${userId.slice(0, 8)}]`)

    yield* executeAgentStream({
      messageId,
      userId,
      itemService: this.itemService,
      outfitService: this.outfitService,
      messageRepository: this.messageRepository,
      conversationRepository: this.conversationRepository,
    })
  }

  /**
   * Edit a user message and generate new assistant response.
   * Returns a stream for real-time updates.
   *
   * @param {string} userId - The user ID
   * @param {string} messageId - The user message ID to edit
   * @param {string} newText - The new message text
   * @returns {AsyncIterable<StreamChunk>} - Stream of chunks
   */
  async *editMessage(
    userId: string,
    messageId: string,
    newText: string
  ): AsyncIterable<StreamChunk> {
    const originalMessage = await this.messageRepository.findById(messageId)
    if (!originalMessage) {
      throw new HTTPError(404, 'Message not found')
    }

    if (originalMessage.role !== 'user') {
      throw new HTTPError(400, 'Can only edit user messages')
    }

    const conversationId = originalMessage.conversationId
    const preview = newText.length > 50 
      ? newText.slice(0, 50) + '...' 
      : newText

    const newUIMessage: UIMessage = {
      id: generateUUID(),
      role: 'user',
      parts: [{ type: 'text', text: newText }],
    }

    const savedMessage = await this.messageRepository.createEditMessage(
      conversationId,
      messageId,
      newUIMessage
    )

    logger.info(`Edit message "${preview}" [conv:${conversationId.slice(0, 8)} msg:${savedMessage.id.slice(0, 8)} user:${userId.slice(0, 8)}]`)

    yield* executeAgentStream({
      messageId: savedMessage.id,
      userId,
      itemService: this.itemService,
      outfitService: this.outfitService,
      messageRepository: this.messageRepository,
      conversationRepository: this.conversationRepository,
    })
  }

  /**
   * List all conversations for a user (without messages).
   *
   * @param {string} userId - The user ID
   * @param {PaginationInput} [pagination] - Optional pagination parameters
   * @returns {Promise<PaginationResult<typeof agentConversation.$inferSelect>>} - Paginated list of conversations
   */
  async conversations(
    userId: string,
    pagination?: PaginationInput
  ): Promise<PaginationResult<typeof agentConversation.$inferSelect>> {
    return this.conversationRepository.findAll(userId, pagination)
  }

  /**
   * Get a conversation with all its messages.
   *
   * @param {string} userId - The user ID
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<typeof agentConversation.$inferSelect & { messages: typeof agentMessage.$inferSelect[] }>} - Conversation with messages
   */
  async conversationById(
    userId: string,
    conversationId: string
  ): Promise<
    typeof agentConversation.$inferSelect & {
      messages: typeof agentMessage.$inferSelect[]
    }
  > {
    const conversation =
      await this.conversationRepository.findByIdWithMessages(conversationId)

    if (!conversation) {
      throw new HTTPError(404, 'Conversation not found')
    }

    if (conversation.userId !== userId) {
      throw new HTTPError(403, 'Access denied')
    }

    return conversation
  }
}

