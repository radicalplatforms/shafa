import type { CorpusOutfit, ItemNode, ItemType, RecommendationConfig } from './types'

export type PoolOutfit = {
  outfit: CorpusOutfit
  nodesById: Map<string, ItemNode>
}

const CORE_TYPES: readonly ItemType[] = ['layer', 'top', 'bottom']

const isCoreType = (type: ItemType): boolean =>
  CORE_TYPES.includes(type as (typeof CORE_TYPES)[number])

const isComplete = (types: Set<ItemType>): boolean =>
  (types.has('top') || types.has('layer')) && types.has('bottom') && types.has('footwear')

const coreSignature = (outfit: CorpusOutfit, nodesById: Map<string, ItemNode>): string | null => {
  const coreIds: string[] = []
  for (const id of outfit.itemIds) {
    const node = nodesById.get(id)
    if (node && isCoreType(node.type)) coreIds.push(id)
  }
  if (coreIds.length === 0) return null
  return coreIds.sort().join('|')
}

export const buildOutfitPool = (
  outfits: CorpusOutfit[],
  nodes: ItemNode[],
  availableItemIds: Set<string>,
  freshnessMap: Map<string, number>,
  config: RecommendationConfig
): PoolOutfit[] => {
  const nodesById = new Map(nodes.map((n) => [n.id, n]))

  const mostRecentBySignature = new Map<string, CorpusOutfit>()
  for (const outfit of outfits) {
    if (outfit.rating < 1) continue

    const presentTypes = new Set<ItemType>()
    let allAvailable = true
    let allFresh = true
    for (const id of outfit.itemIds) {
      if (!availableItemIds.has(id)) {
        allAvailable = false
        break
      }
      if ((freshnessMap.get(id) ?? 0) < config.freshnessVeto) {
        allFresh = false
        break
      }
      const node = nodesById.get(id)
      if (node) presentTypes.add(node.type)
    }
    if (!allAvailable || !allFresh) continue
    if (!isComplete(presentTypes)) continue

    const signature = coreSignature(outfit, nodesById)
    if (signature === null) continue

    const existing = mostRecentBySignature.get(signature)
    const newer =
      !existing || (outfit.wearDate?.getTime() ?? 0) > (existing.wearDate?.getTime() ?? 0)
    if (newer) mostRecentBySignature.set(signature, outfit)
  }

  return [...mostRecentBySignature.values()].map((outfit) => {
    const outfitNodes = new Map<string, ItemNode>()
    for (const id of outfit.itemIds) {
      const node = nodesById.get(id)
      if (node) outfitNodes.set(id, node)
    }
    return { outfit, nodesById: outfitNodes }
  })
}
