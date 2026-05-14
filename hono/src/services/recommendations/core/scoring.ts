import type { RecommendationConfig } from './types'

export const ratingFactor = (rating: 0 | 1 | 2, config: RecommendationConfig): number => {
  if (rating === 2) return 1.0
  if (rating === 1) return config.midWeight
  return -config.missPenalty
}

export const recencyFactor = (
  wearDate: Date | null,
  today: Date,
  config: RecommendationConfig
): number => {
  if (wearDate === null) return config.ghostRecency
  const days = Math.max(
    0,
    Math.floor((today.getTime() - wearDate.getTime()) / (1000 * 60 * 60 * 24))
  )
  return Math.pow(0.5, days / config.recencyHalfLifeDays)
}

export const edgeKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

export const geomean = (values: number[]): number => {
  if (values.length === 0) return 0
  let logSum = 0
  for (const v of values) {
    if (v <= 0) return 0
    logSum += Math.log(v)
  }
  return Math.exp(logSum / values.length)
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
