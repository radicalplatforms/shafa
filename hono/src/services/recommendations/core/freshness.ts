import { ITEM_TYPES } from './config'
import type { AvailableCounts, FreshnessConfig, ItemNode, ItemType } from './types'

export type FreshnessInputItem = {
  id: string
  type: ItemType
  userRating: number
}

const THRESHOLD_MULTIPLIER = 0.75
const MIN_THRESHOLD_DAYS = 3
const FALLBACK_THRESHOLD_DAYS = 7

export const computeRecencyThresholds = (
  availableCounts: AvailableCounts
): Record<ItemType, number> => {
  const result = {} as Record<ItemType, number>
  for (const type of ITEM_TYPES) {
    const proportional = availableCounts[type] * THRESHOLD_MULTIPLIER
    const candidate = proportional > 0 ? proportional : FALLBACK_THRESHOLD_DAYS
    result[type] = Math.max(candidate, MIN_THRESHOLD_DAYS)
  }
  return result
}

export const freshnessForItem = (
  type: ItemType,
  lastWornAt: Date | null,
  today: Date,
  freshness: FreshnessConfig
): number => {
  if (!lastWornAt) return freshness.maxFreshness

  const daysSinceWorn = Math.floor((today.getTime() - lastWornAt.getTime()) / (1000 * 60 * 60 * 24))

  const recencyThreshold = freshness.recencyThresholds[type] ?? freshness.defaultRecencyThreshold
  const risePhase = recencyThreshold

  if (daysSinceWorn <= 0) return freshness.minFreshness

  if (daysSinceWorn < risePhase) {
    const progress = daysSinceWorn / risePhase
    const logisticValue = 1 / (1 + Math.exp(-freshness.steepness * (progress - freshness.midpoint)))
    const startValue = 1 / (1 + Math.exp(-freshness.steepness * (0 - freshness.midpoint)))
    const endValue = 1 / (1 + Math.exp(-freshness.steepness * (1 - freshness.midpoint)))
    const normalized = (logisticValue - startValue) / (endValue - startValue)
    return freshness.minFreshness + (freshness.maxFreshness - freshness.minFreshness) * normalized
  }

  return freshness.maxFreshness
}

export const computeFreshnessMap = (
  items: FreshnessInputItem[],
  lastWornByItem: Map<string, Date>,
  today: Date,
  freshness: FreshnessConfig
): Map<string, number> => {
  const map = new Map<string, number>()
  for (const item of items) {
    map.set(
      item.id,
      freshnessForItem(item.type, lastWornByItem.get(item.id) ?? null, today, freshness)
    )
  }
  return map
}

export const buildItemNodes = (
  items: FreshnessInputItem[],
  freshnessMap: Map<string, number>,
  lastWornByItem: Map<string, Date>
): ItemNode[] =>
  items.map((item) => ({
    id: item.id,
    type: item.type,
    freshness: freshnessMap.get(item.id) ?? 1.0,
    lastWornAt: lastWornByItem.get(item.id)?.toISOString().split('T')[0] ?? null,
    userRating: item.userRating,
  }))
