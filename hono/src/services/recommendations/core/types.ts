export type ItemType = 'layer' | 'top' | 'bottom' | 'footwear' | 'accessory'

export type GapSlot = 'topOrLayer' | 'bottom' | 'footwear' | 'accessory'

export type ItemNode = {
  id: string
  type: ItemType
  freshness: number
  lastWornAt: string | null
  userRating: number
}

export type EdgeWeight = {
  weight: number
  rawWeight: number
}

export type CorpusOutfit = {
  id: string
  rating: 0 | 1 | 2
  wearDate: Date | null
  itemIds: string[]
}

export type AvailableCounts = Record<ItemType, number>

export type FreshnessConfig = {
  recencyThresholds: Record<ItemType, number>
  defaultRecencyThreshold: number
  minFreshness: number
  maxFreshness: number
  steepness: number
  midpoint: number
}

export type RecommendationConfig = {
  midWeight: number
  missPenalty: number
  recencyHalfLifeDays: number
  ghostRecency: number
  starterNeutralBaseline: number
  typeSaturationPenalty: number
  scoreFloor: number
  marginRatio: number
  minCoverageRatio: number
  minCorpusOutfits: number
  antiEdgeThreshold: number
  completeOverrideFloor: number
  gapBoostMultiplier: number
  itemRatingWeight: number
  betaFreshness: number
  betaCohorrence: number
  cohorrenceLookbackDays: number
  alphaRating: number
  alphaCohesion: number
  alphaFreshness: number
  lambdaOverlap: number
  localSearchPasses: number
  marginalGainFloor: number
  rotationDefaultSize: number
  freshnessVeto: number
  freshness: FreshnessConfig
}

export type ItemRankingEntry = {
  itemId: string
  score: number
  isAutocomplete: boolean
  coverage?: number
  connectedTo?: string[]
}

export type ItemRankingResult = {
  ranking: ItemRankingEntry[]
  autocompleteCount: number
  mode: 'starter' | 'composing'
  gapTypes: GapSlot[]
  corpusSize: number
  autocompleteReason?: string
}

export type OutfitQualityBreakdown = {
  rating: number
  cohesion: number
  freshness: number
}

export type RotationEntry = {
  outfitId: string
  quality: number
  breakdown: OutfitQualityBreakdown
  repeats: Record<string, number>
}

export type RotationResult = {
  rotation: RotationEntry[]
  wardrobeSize: number
  rotationSize: number
  requestedSize: number
  reason?: string
}

export type GradeLetter = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'

export type OutfitGrade = {
  grade: GradeLetter
  score: number
  freshnessTerm: number
  avgFreshness: number
  minFreshness: number
  cohorrenceTerm: number
  mostRecentOverlap: {
    outfitId: string
    sharedItems: string[]
    daysAgo: number
  } | null
  coldStart: boolean
}
