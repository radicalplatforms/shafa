import { withConfigOverrides } from './core/config'
import { buildItemNodes, computeFreshnessMap, computeRecencyThresholds } from './core/freshness'
import { buildItemGraph } from './core/graph'
import type { EdgeWeight, ItemNode, RecommendationConfig } from './core/types'
import type { Corpus } from './corpus'

export type RecommendationContext = {
  config: RecommendationConfig
  today: Date
  corpus: Corpus
  nodes: ItemNode[]
  edges: Map<string, EdgeWeight>
  freshnessMap: Map<string, number>
}

export const buildContext = (
  corpus: Corpus,
  today: Date,
  configOverrides: Partial<RecommendationConfig> = {}
): RecommendationContext => {
  const baseConfig = withConfigOverrides(configOverrides)
  const recencyThresholds = computeRecencyThresholds(corpus.availableCounts)
  const config: RecommendationConfig = {
    ...baseConfig,
    freshness: { ...baseConfig.freshness, recencyThresholds },
  }

  const freshnessMap = computeFreshnessMap(
    corpus.availableItems,
    corpus.lastWornByItem,
    today,
    config.freshness
  )

  const nodes = buildItemNodes(corpus.availableItems, freshnessMap, corpus.lastWornByItem)
  const edges = buildItemGraph(corpus.outfits, corpus.availableItemIds, today, config)

  return { config, today, corpus, nodes, edges, freshnessMap }
}
