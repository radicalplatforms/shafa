import type { GapSlot, ItemType, RecommendationConfig } from './types'

export const REQUIRED_GAP_SLOTS: readonly GapSlot[] = ['topOrLayer', 'bottom', 'footwear'] as const

export const ITEM_TYPES: readonly ItemType[] = [
  'layer',
  'top',
  'bottom',
  'footwear',
  'accessory',
] as const

const FALLBACK_RECENCY_DAYS = 7

const fallbackThresholds = (): Record<ItemType, number> => ({
  layer: FALLBACK_RECENCY_DAYS,
  top: FALLBACK_RECENCY_DAYS,
  bottom: FALLBACK_RECENCY_DAYS,
  footwear: FALLBACK_RECENCY_DAYS,
  accessory: FALLBACK_RECENCY_DAYS,
})

export const DEFAULT_CONFIG: RecommendationConfig = {
  midWeight: 0.35,
  missPenalty: 0.5,
  recencyHalfLifeDays: 90,
  ghostRecency: 0.6,
  starterNeutralBaseline: 0.05,
  typeSaturationPenalty: 0.5,
  scoreFloor: 0.5,
  marginRatio: 0.6,
  minCoverageRatio: 0.5,
  minCorpusOutfits: 3,
  antiEdgeThreshold: -0.3,
  completeOverrideFloor: 1.0,
  gapBoostMultiplier: 1.4,
  itemRatingWeight: 0.25,
  betaFreshness: 0.7,
  betaCohorrence: 0.3,
  cohorrenceLookbackDays: 30,
  alphaRating: 0.4,
  alphaCohesion: 0.3,
  alphaFreshness: 0.3,
  lambdaOverlap: 0.6,
  localSearchPasses: 50,
  marginalGainFloor: 0.05,
  rotationDefaultSize: 10,
  freshnessVeto: 0.05,
  freshness: {
    recencyThresholds: fallbackThresholds(),
    defaultRecencyThreshold: FALLBACK_RECENCY_DAYS,
    minFreshness: 0.01,
    maxFreshness: 1.0,
    steepness: 7.0,
    midpoint: 0.7,
  },
}

export const gapSlotForType = (type: ItemType): GapSlot => {
  switch (type) {
    case 'layer':
    case 'top':
      return 'topOrLayer'
    case 'bottom':
      return 'bottom'
    case 'footwear':
      return 'footwear'
    case 'accessory':
      return 'accessory'
  }
}

export const withConfigOverrides = (
  overrides: Partial<RecommendationConfig>
): RecommendationConfig => ({
  ...DEFAULT_CONFIG,
  ...overrides,
  freshness: { ...DEFAULT_CONFIG.freshness, ...(overrides.freshness ?? {}) },
})
