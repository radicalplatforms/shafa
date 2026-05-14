import { zValidator } from '@hono/zod-validator'
import { isCuid } from '@paralleldrive/cuid2'
import { Hono } from 'hono'
import { z } from 'zod'

import { requireAuth } from '../../utils/auth'
import type { AuthVariables } from '../../utils/auth'
import type { DBVariables } from '../../utils/inject-db'
import injectDB from '../../utils/inject-db'
import { serializeRecommendationCache } from './cache'
import { gradeOutfit } from './core/grading'
import { rankItems } from './core/item-ranking'
import { buildOutfitPool } from './core/outfit-pool'
import { selectRotation } from './core/rotation'
import type { RecommendationConfig } from './core/types'
import { loadUserCorpus } from './corpus'
import { buildContext } from './handlers'

const ALGORITHM_VERSION = 'v3'

const cuidString = z.string().refine((val) => isCuid(val), { message: 'Invalid item id' })

const itemRankingBody = z.object({
  selectedItemIds: z.array(cuidString).min(0).max(8),
  autocompleteCount: z.coerce.number().int().min(1).max(3).default(1),
})

const gradeBody = z.object({
  itemIds: z.array(cuidString).min(1).max(8),
})

const recommendQuery = z.object({
  size: z.coerce.number().int().min(1).max(30).optional(),
  lambda_overlap: z.coerce.number().min(0).max(5).optional(),
  marginal_gain_floor: z.coerce.number().min(0).max(1).optional(),
  mid_weight: z.coerce.number().min(0).max(1).optional(),
  miss_penalty: z.coerce.number().min(0).max(2).optional(),
  recency_half_life_days: z.coerce.number().min(1).max(3650).optional(),
})

const queryToConfigOverrides = (
  query: z.infer<typeof recommendQuery>
): Partial<RecommendationConfig> => {
  const out: Partial<RecommendationConfig> = {}
  if (query.lambda_overlap !== undefined) out.lambdaOverlap = query.lambda_overlap
  if (query.marginal_gain_floor !== undefined) out.marginalGainFloor = query.marginal_gain_floor
  if (query.mid_weight !== undefined) out.midWeight = query.mid_weight
  if (query.miss_penalty !== undefined) out.missPenalty = query.miss_penalty
  if (query.recency_half_life_days !== undefined)
    out.recencyHalfLifeDays = query.recency_half_life_days
  return out
}

const app = new Hono<{ Variables: AuthVariables & DBVariables }>()
  .post('/item-ranking', zValidator('json', itemRankingBody), requireAuth, injectDB, async (c) => {
    const userId = c.get('auth')?.userId || ''
    const { selectedItemIds, autocompleteCount } = c.req.valid('json')
    const today = new Date()

    const corpus = await loadUserCorpus(c.get('db'), userId)

    const invalid = selectedItemIds.filter((id) => !corpus.availableItemIds.has(id))
    if (invalid.length > 0) {
      return c.json({ reason: 'invalid_selection', invalid }, 400)
    }

    const ctx = buildContext(corpus, today)
    const result = rankItems({
      nodes: ctx.nodes,
      edges: ctx.edges,
      selectedItemIds,
      autocompleteCount,
      corpusSize: corpus.ratedOutfitCount,
      config: ctx.config,
    })

    return c.json({
      ranking: result.ranking,
      autocomplete_count: result.autocompleteCount,
      generated_at: today.toISOString(),
      metadata: {
        algorithm_version: ALGORITHM_VERSION,
        corpus_size: corpus.ratedOutfitCount,
        gap_types: result.gapTypes,
        mode: result.mode,
        autocomplete_reason: result.autocompleteReason,
      },
    })
  })
  .get('/recommend', zValidator('query', recommendQuery), requireAuth, injectDB, async (c) => {
    const userId = c.get('auth')?.userId || ''
    const today = new Date()
    const query = c.req.valid('query')
    const corpus = await loadUserCorpus(c.get('db'), userId)
    const ctx = buildContext(corpus, today, queryToConfigOverrides(query))

    const requestedSize = query.size ?? ctx.config.rotationDefaultSize
    const pool = buildOutfitPool(
      corpus.outfits,
      ctx.nodes,
      corpus.availableItemIds,
      ctx.freshnessMap,
      ctx.config
    )

    const result = selectRotation({
      pool,
      edges: ctx.edges,
      availableCounts: corpus.availableCounts,
      wardrobeSize: corpus.availableItems.length,
      requestedSize,
      config: ctx.config,
    })

    return c.json({
      rotation: result.rotation,
      generated_at: today.toISOString(),
      metadata: {
        algorithm_version: ALGORITHM_VERSION,
        wardrobe_size: result.wardrobeSize,
        rotation_size: result.rotationSize,
        requested_size: result.requestedSize,
        reason: result.reason,
      },
    })
  })
  .post('/grade', zValidator('json', gradeBody), requireAuth, injectDB, async (c) => {
    const userId = c.get('auth')?.userId || ''
    const { itemIds } = c.req.valid('json')
    const today = new Date()

    const corpus = await loadUserCorpus(c.get('db'), userId)
    const invalid = itemIds.filter((id) => !corpus.availableItemIds.has(id))
    if (invalid.length > 0) {
      return c.json({ reason: 'invalid_outfit', invalid }, 400)
    }

    const ctx = buildContext(corpus, today)
    const grade = gradeOutfit({
      outfitItemIds: itemIds,
      nodes: ctx.nodes,
      recentOutfits: corpus.outfits,
      today,
      corpusSize: corpus.ratedOutfitCount,
      config: ctx.config,
    })

    return c.json({
      grade: grade.grade,
      score: grade.score,
      breakdown: {
        freshness: {
          term: grade.freshnessTerm,
          avg: grade.avgFreshness,
          min: grade.minFreshness,
        },
        cohorrence: {
          term: grade.cohorrenceTerm,
          mostRecentOverlap: grade.mostRecentOverlap,
        },
      },
      generated_at: today.toISOString(),
      metadata: {
        algorithm_version: ALGORITHM_VERSION,
        corpus_size: corpus.ratedOutfitCount,
        cold_start: grade.coldStart,
      },
    })
  })
  .get('/recommendation-cache', requireAuth, injectDB, async (c) => {
    const userId = c.get('auth')?.userId || ''
    const today = new Date()
    const corpus = await loadUserCorpus(c.get('db'), userId)
    const ctx = buildContext(corpus, today)

    const cohorrenceMs = ctx.config.cohorrenceLookbackDays * 24 * 60 * 60 * 1000
    const recentOutfits = corpus.outfits.flatMap((o) => {
      if (!o.wearDate) return []
      const age = today.getTime() - o.wearDate.getTime()
      if (age < 0 || age > cohorrenceMs) return []
      return [{ id: o.id, wearDate: o.wearDate, itemIds: o.itemIds }]
    })

    const cache = serializeRecommendationCache({
      nodes: ctx.nodes,
      edges: ctx.edges,
      recentOutfits,
      corpusSize: corpus.ratedOutfitCount,
      config: ctx.config,
      generatedAt: today,
    })

    const etag = `"${cache.cache_version}"`
    const ifNoneMatch = c.req.header('if-none-match')
    if (ifNoneMatch && ifNoneMatch === etag) {
      return c.body(null, 304, {
        ETag: etag,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      })
    }

    c.header('ETag', etag)
    c.header('Cache-Control', 'private, max-age=0, must-revalidate')
    return c.json(cache)
  })

export default app
