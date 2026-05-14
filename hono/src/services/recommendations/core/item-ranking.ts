import { REQUIRED_GAP_SLOTS, gapSlotForType } from './config'
import { getEdge } from './graph'
import { geomean } from './scoring'
import type {
  EdgeWeight,
  GapSlot,
  ItemNode,
  ItemRankingEntry,
  ItemRankingResult,
  RecommendationConfig,
} from './types'

export type RankItemsInput = {
  nodes: ItemNode[]
  edges: Map<string, EdgeWeight>
  selectedItemIds: string[]
  autocompleteCount: number
  corpusSize: number
  config: RecommendationConfig
}

export const rankItems = (input: RankItemsInput): ItemRankingResult => {
  const { nodes, edges, selectedItemIds, autocompleteCount, corpusSize, config } = input
  const selectedSet = new Set(selectedItemIds)
  const selectedNodes = nodes.filter((n) => selectedSet.has(n.id))
  const candidates = nodes.filter((n) => !selectedSet.has(n.id))
  const mode: 'starter' | 'composing' = selectedNodes.length === 0 ? 'starter' : 'composing'

  const filledSlots = new Set<GapSlot>(selectedNodes.map((n) => gapSlotForType(n.type)))
  const gapTypes: GapSlot[] = REQUIRED_GAP_SLOTS.filter((slot) => !filledSlots.has(slot))

  const presentTypes = new Set(selectedNodes.map((n) => n.type))

  const centralityCache = new Map<string, number>()
  const nodeIds = nodes.map((n) => n.id)
  const computeCentrality = (id: string): number => {
    const cached = centralityCache.get(id)
    if (cached !== undefined) return cached
    let sum = 0
    for (const other of nodeIds) {
      if (other === id) continue
      sum += getEdge(edges, id, other).weight
    }
    const value = sum / Math.max(1, nodeIds.length - 1)
    centralityCache.set(id, value)
    return value
  }

  const scored = candidates.map((c): { entry: ItemRankingEntry; vetoed: boolean } => {
    const ratingBoost = 1 + config.itemRatingWeight * (c.userRating / 4)
    const freshnessBoost = c.freshness

    if (mode === 'starter') {
      const centrality = computeCentrality(c.id)
      const score = (centrality + config.starterNeutralBaseline) * freshnessBoost * ratingBoost
      return {
        entry: { itemId: c.id, score, isAutocomplete: false },
        vetoed: false,
      }
    }

    let antiCoverage = 0
    let coverage = 0
    const connectedTo: string[] = []
    const positiveEdges: number[] = []

    for (const p of selectedNodes) {
      const edge = getEdge(edges, p.id, c.id)
      if (edge.rawWeight < config.antiEdgeThreshold) antiCoverage++
      if (edge.weight > 0) {
        coverage++
        connectedTo.push(p.id)
        positiveEdges.push(edge.weight)
      }
    }

    if (antiCoverage > 0) {
      return {
        entry: { itemId: c.id, score: 0, isAutocomplete: false, coverage, connectedTo },
        vetoed: true,
      }
    }

    const edgeAggregate = coverage === 0 ? config.starterNeutralBaseline : geomean(positiveEdges)
    const coverageFactor =
      (coverage + config.starterNeutralBaseline) / Math.max(selectedNodes.length, 1)

    const slot = gapSlotForType(c.type)
    const gapBoost = gapTypes.includes(slot) ? config.gapBoostMultiplier : 1.0
    const slotFilled = !gapTypes.includes(slot)
    const sameTypeInP = presentTypes.has(c.type)
    const typeSaturation = slotFilled && sameTypeInP ? config.typeSaturationPenalty : 1.0

    const score =
      edgeAggregate * coverageFactor * gapBoost * typeSaturation * freshnessBoost * ratingBoost

    return {
      entry: { itemId: c.id, score, isAutocomplete: false, coverage, connectedTo },
      vetoed: false,
    }
  })

  const visible = scored.filter((s) => !s.vetoed).map((s) => s.entry)
  visible.sort((a, b) => b.score - a.score)

  const flagged = flagAutocomplete({
    visible,
    selectedCount: selectedNodes.length,
    gapTypes,
    autocompleteCount,
    corpusSize,
    mode,
    config,
  })

  return {
    ranking: flagged.ranking,
    autocompleteCount: flagged.flagged,
    mode,
    gapTypes,
    corpusSize,
    autocompleteReason: flagged.reason,
  }
}

type FlagInput = {
  visible: ItemRankingEntry[]
  selectedCount: number
  gapTypes: GapSlot[]
  autocompleteCount: number
  corpusSize: number
  mode: 'starter' | 'composing'
  config: RecommendationConfig
}

const flagAutocomplete = (
  input: FlagInput
): { ranking: ItemRankingEntry[]; flagged: number; reason?: string } => {
  const { visible, selectedCount, gapTypes, autocompleteCount, corpusSize, mode, config } = input

  if (mode === 'starter') {
    return { ranking: visible, flagged: 0, reason: 'starter_mode' }
  }

  if (corpusSize < config.minCorpusOutfits) {
    return { ranking: visible, flagged: 0, reason: 'corpus_too_small' }
  }

  if (visible.length === 0) {
    return { ranking: visible, flagged: 0, reason: 'no_candidates' }
  }

  const topScore = visible[0].score
  if (topScore < config.scoreFloor) {
    return { ranking: visible, flagged: 0, reason: 'score_too_low' }
  }

  const requiredCoverage = Math.ceil(selectedCount * config.minCoverageRatio)
  const topCoverage = visible[0].coverage ?? 0
  if (topCoverage < requiredCoverage) {
    return { ranking: visible, flagged: 0, reason: 'coverage_too_thin' }
  }

  if (
    gapTypes.length === 0 &&
    selectedCount >= 4 &&
    visible.every((e) => e.score < config.completeOverrideFloor)
  ) {
    return { ranking: visible, flagged: 0, reason: 'outfit_appears_complete' }
  }

  let flaggedCount = 0
  for (let i = 0; i < Math.min(autocompleteCount, visible.length); i++) {
    if (i === 0) {
      visible[0].isAutocomplete = true
      flaggedCount = 1
      continue
    }
    if (visible[i].score >= config.marginRatio * topScore) {
      visible[i].isAutocomplete = true
      flaggedCount++
    } else {
      break
    }
  }

  return { ranking: visible, flagged: flaggedCount }
}
