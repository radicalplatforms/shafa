import { getEdge } from './graph'
import type { PoolOutfit } from './outfit-pool'
import { clamp } from './scoring'
import type {
  AvailableCounts,
  EdgeWeight,
  ItemType,
  OutfitQualityBreakdown,
  RecommendationConfig,
  RotationEntry,
  RotationResult,
} from './types'

type Quality = { value: number; breakdown: OutfitQualityBreakdown; minFreshness: number }

const ratingTerm = (rating: 0 | 1 | 2): number => clamp(rating / 2, 0, 1)

const cohesionTerm = (outfit: PoolOutfit, edges: Map<string, EdgeWeight>): number => {
  const ids = [...outfit.nodesById.keys()]
  if (ids.length < 2) return 0
  let sum = 0
  let pairs = 0
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      sum += getEdge(edges, ids[i], ids[j]).weight
      pairs++
    }
  }
  return 1 - Math.exp(-sum / pairs)
}

const freshnessStats = (outfit: PoolOutfit): { avg: number; min: number } => {
  let sum = 0
  let min = Infinity
  let count = 0
  for (const node of outfit.nodesById.values()) {
    sum += node.freshness
    if (node.freshness < min) min = node.freshness
    count++
  }
  if (count === 0) return { avg: 0, min: 0 }
  return { avg: sum / count, min }
}

const quality = (
  outfit: PoolOutfit,
  edges: Map<string, EdgeWeight>,
  config: RecommendationConfig
): Quality => {
  const r = ratingTerm(outfit.outfit.rating)
  const c = cohesionTerm(outfit, edges)
  const { avg, min } = freshnessStats(outfit)
  const f = 0.4 * avg + 0.6 * Math.pow(min, 1.5)
  const value = config.alphaRating * r + config.alphaCohesion * c + config.alphaFreshness * f
  return { value, breakdown: { rating: r, cohesion: c, freshness: f }, minFreshness: min }
}

const scarcity = (type: ItemType, availableCounts: AvailableCounts, setSize: number): number =>
  1 / Math.max(1, availableCounts[type] - setSize)

const computeSetScore = (
  set: PoolOutfit[],
  qualityById: Map<string, Quality>,
  availableCounts: AvailableCounts,
  config: RecommendationConfig
): number => {
  if (set.length === 0) return 0
  let qualitySum = 0
  for (const o of set) qualitySum += qualityById.get(o.outfit.id)!.value

  const counts = new Map<string, { count: number; type: ItemType }>()
  for (const o of set) {
    for (const [id, node] of o.nodesById.entries()) {
      const existing = counts.get(id)
      if (existing) existing.count++
      else counts.set(id, { count: 1, type: node.type })
    }
  }

  let penalty = 0
  for (const { count, type } of counts.values()) {
    if (count <= 1) continue
    penalty += Math.pow(count - 1, 2) * scarcity(type, availableCounts, set.length)
  }

  return qualitySum - config.lambdaOverlap * penalty
}

export type RotationInput = {
  pool: PoolOutfit[]
  edges: Map<string, EdgeWeight>
  availableCounts: AvailableCounts
  wardrobeSize: number
  requestedSize: number
  config: RecommendationConfig
}

export const selectRotation = (input: RotationInput): RotationResult => {
  const { pool, edges, availableCounts, wardrobeSize, requestedSize, config } = input

  if (pool.length === 0) {
    return {
      rotation: [],
      wardrobeSize,
      rotationSize: 0,
      requestedSize,
      reason: 'no_eligible_outfits',
    }
  }

  const qualityById = new Map<string, Quality>()
  for (const o of pool) qualityById.set(o.outfit.id, quality(o, edges, config))

  const selected: PoolOutfit[] = []
  const selectedIds = new Set<string>()

  while (selected.length < requestedSize) {
    const currentScore = computeSetScore(selected, qualityById, availableCounts, config)
    let bestDelta = -Infinity
    let bestOutfit: PoolOutfit | null = null
    for (const candidate of pool) {
      if (selectedIds.has(candidate.outfit.id)) continue
      const trialScore = computeSetScore(
        [...selected, candidate],
        qualityById,
        availableCounts,
        config
      )
      const delta = trialScore - currentScore
      if (delta > bestDelta) {
        bestDelta = delta
        bestOutfit = candidate
      }
    }
    if (!bestOutfit || bestDelta < config.marginalGainFloor) break
    selected.push(bestOutfit)
    selectedIds.add(bestOutfit.outfit.id)
  }

  for (let pass = 0; pass < config.localSearchPasses; pass++) {
    let improved = false
    const baseScore = computeSetScore(selected, qualityById, availableCounts, config)
    for (let i = 0; i < selected.length && !improved; i++) {
      for (const candidate of pool) {
        if (selectedIds.has(candidate.outfit.id)) continue
        const trial = selected.slice()
        trial[i] = candidate
        const trialScore = computeSetScore(trial, qualityById, availableCounts, config)
        if (trialScore > baseScore) {
          selectedIds.delete(selected[i].outfit.id)
          selectedIds.add(candidate.outfit.id)
          selected[i] = candidate
          improved = true
          break
        }
      }
    }
    if (!improved) break
  }

  const itemCounts = new Map<string, number>()
  for (const o of selected) {
    for (const id of o.nodesById.keys()) itemCounts.set(id, (itemCounts.get(id) ?? 0) + 1)
  }

  const entries: RotationEntry[] = selected.map((o) => {
    const q = qualityById.get(o.outfit.id)!
    const repeats: Record<string, number> = {}
    for (const id of o.nodesById.keys()) {
      const count = itemCounts.get(id) ?? 0
      if (count > 1) repeats[id] = count
    }
    return { outfitId: o.outfit.id, quality: q.value, breakdown: q.breakdown, repeats }
  })

  entries.sort((a, b) => {
    if (b.quality !== a.quality) return b.quality - a.quality
    const aMin = qualityById.get(a.outfitId)!.minFreshness
    const bMin = qualityById.get(b.outfitId)!.minFreshness
    return bMin - aMin
  })

  const reason =
    entries.length < requestedSize && pool.length <= entries.length
      ? 'pool_smaller_than_requested'
      : undefined

  return {
    rotation: entries,
    wardrobeSize,
    rotationSize: entries.length,
    requestedSize,
    reason,
  }
}
