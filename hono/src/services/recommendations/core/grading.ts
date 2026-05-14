import type {
  CorpusOutfit,
  GradeLetter,
  ItemNode,
  OutfitGrade,
  RecommendationConfig,
} from './types'

const letterFor = (score: number): GradeLetter => {
  if (score >= 0.95) return 'A+'
  if (score >= 0.85) return 'A'
  if (score >= 0.75) return 'B+'
  if (score >= 0.65) return 'B'
  if (score >= 0.55) return 'C+'
  if (score >= 0.45) return 'C'
  if (score >= 0.25) return 'D'
  return 'F'
}

export type GradeInput = {
  outfitItemIds: string[]
  nodes: ItemNode[]
  recentOutfits: CorpusOutfit[]
  today: Date
  corpusSize: number
  config: RecommendationConfig
}

export const gradeOutfit = (input: GradeInput): OutfitGrade => {
  const { outfitItemIds, nodes, recentOutfits, today, corpusSize, config } = input
  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const targetItems = outfitItemIds.map((id) => nodesById.get(id)).filter((n): n is ItemNode => !!n)
  const freshnesses = targetItems.map((n) => n.freshness)
  const avgFreshness =
    freshnesses.length > 0 ? freshnesses.reduce((a, b) => a + b, 0) / freshnesses.length : 0
  const minFreshness = freshnesses.length > 0 ? Math.min(...freshnesses) : 0
  const freshnessTerm = 0.4 * avgFreshness + 0.6 * Math.pow(minFreshness, 1.5)

  const coldStart = corpusSize < config.minCorpusOutfits

  const cohorrenceLookbackMs = config.cohorrenceLookbackDays * 24 * 60 * 60 * 1000
  const targetSet = new Set(outfitItemIds)

  let maxOverlap = 0
  let bestMatch: { outfitId: string; sharedItems: string[]; daysAgo: number } | null = null

  if (!coldStart) {
    for (const o of recentOutfits) {
      if (!o.wearDate) continue
      const age = today.getTime() - o.wearDate.getTime()
      if (age < 0 || age > cohorrenceLookbackMs) continue
      const shared = o.itemIds.filter((id) => targetSet.has(id))
      const union = new Set([...o.itemIds, ...outfitItemIds]).size
      if (union === 0) continue
      const overlap = shared.length / union
      if (overlap > maxOverlap) {
        maxOverlap = overlap
        bestMatch = {
          outfitId: o.id,
          sharedItems: shared,
          daysAgo: Math.floor(age / (24 * 60 * 60 * 1000)),
        }
      }
    }
  }

  const cohorrenceTerm = coldStart ? 1.0 : 1 - maxOverlap
  const score = Math.max(
    0,
    Math.min(1, config.betaFreshness * freshnessTerm + config.betaCohorrence * cohorrenceTerm)
  )

  return {
    grade: letterFor(score),
    score,
    freshnessTerm,
    avgFreshness,
    minFreshness,
    cohorrenceTerm,
    mostRecentOverlap: bestMatch,
    coldStart,
  }
}

export { letterFor }
