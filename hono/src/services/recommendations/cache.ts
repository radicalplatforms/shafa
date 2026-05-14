import type { EdgeWeight, ItemNode, RecommendationConfig } from './core/types'

export type SerializedCache = {
  generated_at: string
  cache_version: string
  config: RecommendationConfig
  nodes: ItemNode[]
  edges: [string, string, number, number][]
  recent_outfits: { id: string; wearDate: string; itemIds: string[] }[]
  corpus_size: number
}

const EDGE_EPSILON = 1e-6

export type SerializeInput = {
  nodes: ItemNode[]
  edges: Map<string, EdgeWeight>
  recentOutfits: { id: string; wearDate: Date; itemIds: string[] }[]
  corpusSize: number
  config: RecommendationConfig
  generatedAt: Date
}

const fnv1a = (input: string): string => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

export const serializeRecommendationCache = (input: SerializeInput): SerializedCache => {
  const edgesOut: [string, string, number, number][] = []
  for (const [key, edge] of input.edges.entries()) {
    if (Math.abs(edge.rawWeight) < EDGE_EPSILON) continue
    const [a, b] = key.split('|')
    edgesOut.push([a, b, edge.weight, edge.rawWeight])
  }
  edgesOut.sort((x, y) => (x[0] === y[0] ? x[1].localeCompare(y[1]) : x[0].localeCompare(y[0])))

  const recent = input.recentOutfits
    .slice()
    .sort((a, b) => b.wearDate.getTime() - a.wearDate.getTime() || a.id.localeCompare(b.id))
    .map((o) => ({
      id: o.id,
      wearDate: o.wearDate.toISOString().split('T')[0],
      itemIds: o.itemIds.slice().sort(),
    }))

  const nodes = input.nodes.slice().sort((a, b) => a.id.localeCompare(b.id))

  const versionPayload = JSON.stringify({
    nodes: nodes.map((n) => [n.id, n.freshness.toFixed(6), n.lastWornAt, n.userRating]),
    edges: edgesOut.map((e) => [e[0], e[1], e[2].toFixed(6), e[3].toFixed(6)]),
    recent: recent.map((r) => [r.id, r.wearDate, r.itemIds.join(',')]),
    config: input.config,
  })

  return {
    generated_at: input.generatedAt.toISOString(),
    cache_version: fnv1a(versionPayload),
    config: input.config,
    nodes,
    edges: edgesOut,
    recent_outfits: recent,
    corpus_size: input.corpusSize,
  }
}
