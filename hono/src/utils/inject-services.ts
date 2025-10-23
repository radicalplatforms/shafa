import type { MiddlewareHandler } from 'hono'

import { ItemRepository } from '../repositories/ItemRepository'
import { OutfitRepository } from '../repositories/OutfitRepository'
import { TagRepository } from '../repositories/TagRepository'
import { ItemService } from '../services/ItemService'
import { OutfitService } from '../services/OutfitService'
import { TagService } from '../services/TagService'
import type { DBVariables } from './inject-db'

export type ServiceVariables = {
  itemRepository: ItemRepository
  outfitRepository: OutfitRepository
  tagRepository: TagRepository
  itemService: ItemService
  outfitService: OutfitService
  tagService: TagService
}

const injectServices: MiddlewareHandler<{
  Variables: DBVariables & ServiceVariables
}> = async (c, next) => {
  const db = c.get('db')

  // Create repositories
  const itemRepository = new ItemRepository(db)
  const outfitRepository = new OutfitRepository(db)
  const tagRepository = new TagRepository(db)

  // Create services with repository dependencies
  const itemService = new ItemService(itemRepository)
  const outfitService = new OutfitService(outfitRepository, itemRepository)
  const tagService = new TagService(tagRepository)

  // Inject into context
  c.set('itemRepository', itemRepository)
  c.set('outfitRepository', outfitRepository)
  c.set('tagRepository', tagRepository)
  c.set('itemService', itemService)
  c.set('outfitService', outfitService)
  c.set('tagService', tagService)

  await next()
}

export default injectServices
