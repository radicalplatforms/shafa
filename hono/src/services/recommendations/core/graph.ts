import { edgeKey, ratingFactor, recencyFactor } from './scoring'
import type { CorpusOutfit, EdgeWeight, RecommendationConfig } from './types'

export const buildItemGraph = (
  outfits: CorpusOutfit[],
  availableItemIds: Set<string>,
  today: Date,
  config: RecommendationConfig
): Map<string, EdgeWeight> => {
  const edges = new Map<string, EdgeWeight>()

  for (const outfit of outfits) {
    const contribution =
      ratingFactor(outfit.rating, config) * recencyFactor(outfit.wearDate, today, config)
    if (contribution === 0) continue

    const eligibleItems = outfit.itemIds.filter((id) => availableItemIds.has(id))
    for (let i = 0; i < eligibleItems.length; i++) {
      for (let j = i + 1; j < eligibleItems.length; j++) {
        const key = edgeKey(eligibleItems[i], eligibleItems[j])
        const existing = edges.get(key)
        const rawWeight = (existing?.rawWeight ?? 0) + contribution
        edges.set(key, { rawWeight, weight: Math.max(0, rawWeight) })
      }
    }
  }

  return edges
}

export const getEdge = (edges: Map<string, EdgeWeight>, a: string, b: string): EdgeWeight => {
  if (a === b) return { weight: 0, rawWeight: 0 }
  return edges.get(edgeKey(a, b)) ?? { weight: 0, rawWeight: 0 }
}
