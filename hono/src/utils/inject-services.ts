import type { MiddlewareHandler } from 'hono'

import { ItemRepository } from '../repositories/ItemRepository'
import { OutfitRepository } from '../repositories/OutfitRepository'
import { TagRepository } from '../repositories/TagRepository'
import { ItemService } from '../services/ItemService'
import { OutfitService } from '../services/OutfitService'
import { SimilarityService } from '../services/SimilarityService'
import { TagService } from '../services/TagService'
import { WeatherService } from '../services/WeatherService'
import type { DBVariables } from './inject-db'

export type ServiceVariables = {
  itemRepository: ItemRepository
  outfitRepository: OutfitRepository
  tagRepository: TagRepository
  itemService: ItemService
  outfitService: OutfitService
  tagService: TagService
  similarityService: SimilarityService
  weatherService: WeatherService
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
  const similarityService = new SimilarityService(db)
  const weatherService = new WeatherService(db)

  // Inject into context
  c.set('itemRepository', itemRepository)
  c.set('outfitRepository', outfitRepository)
  c.set('tagRepository', tagRepository)
  c.set('itemService', itemService)
  c.set('outfitService', outfitService)
  c.set('tagService', tagService)
  c.set('similarityService', similarityService)
  c.set('weatherService', weatherService)

  await next()
}

export default injectServices
