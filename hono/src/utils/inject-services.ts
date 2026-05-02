import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import type { Context, MiddlewareHandler } from 'hono'
import { env } from 'hono/adapter'

import * as schema from '../schema'
import { AgentService } from '../services/AgentService'
import { ItemService } from '../services/ItemService'
import { OutfitService } from '../services/OutfitService'
import { TagService } from '../services/TagService'
import { ItemRepository } from '../repositories/ItemRepository'
import { OutfitRepository } from '../repositories/OutfitRepository'
import { TagRepository } from '../repositories/TagRepository'
import { ConversationRepository } from '../repositories/ConversationRepository'
import { MessageRepository } from '../repositories/MessageRepository'
import type { AuthVariables } from './auth'

export type Database = NeonHttpDatabase<typeof schema>

export type ServiceVariables = {
  agentService: AgentService
  itemRepository: ItemRepository
  itemService: ItemService
  outfitRepository: OutfitRepository
  outfitService: OutfitService
  tagRepository: TagRepository
  tagService: TagService
  conversationRepository: ConversationRepository
  messageRepository: MessageRepository
}

const injectServices: MiddlewareHandler<{
  Variables: AuthVariables & ServiceVariables
}> = async (c, next) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c as Context)

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const sql = neon(DATABASE_URL)
  const db = drizzle(sql, { schema })

  // Create repositories
  const itemRepository = new ItemRepository(db)
  const outfitRepository = new OutfitRepository(db)
  const tagRepository = new TagRepository(db)
  const conversationRepository = new ConversationRepository(db)
  const messageRepository = new MessageRepository(db)

  // Create services
  const itemService = new ItemService(itemRepository)
  const outfitService = new OutfitService(outfitRepository, itemRepository)
  const tagService = new TagService(tagRepository)
  const agentService = new AgentService(
    itemService,
    outfitService,
    messageRepository,
    conversationRepository
  )

  // Inject into context
  c.set('agentService', agentService)
  c.set('itemRepository', itemRepository)
  c.set('itemService', itemService)
  c.set('outfitRepository', outfitRepository)
  c.set('outfitService', outfitService)
  c.set('tagRepository', tagRepository)
  c.set('tagService', tagService)
  c.set('conversationRepository', conversationRepository)
  c.set('messageRepository', messageRepository)

  await next()
}

export default injectServices
