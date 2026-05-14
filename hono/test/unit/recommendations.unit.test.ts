import { DEFAULT_CONFIG, withConfigOverrides } from '../../src/services/recommendations/core/config'
import {
  computeFreshnessMap,
  freshnessForItem,
} from '../../src/services/recommendations/core/freshness'
import { gradeOutfit, letterFor } from '../../src/services/recommendations/core/grading'
import { buildItemGraph, getEdge } from '../../src/services/recommendations/core/graph'
import { rankItems } from '../../src/services/recommendations/core/item-ranking'
import { buildOutfitPool } from '../../src/services/recommendations/core/outfit-pool'
import { selectRotation } from '../../src/services/recommendations/core/rotation'
import {
  edgeKey,
  geomean,
  ratingFactor,
  recencyFactor,
} from '../../src/services/recommendations/core/scoring'
import type {
  AvailableCounts,
  CorpusOutfit,
  ItemNode,
  RecommendationConfig,
} from '../../src/services/recommendations/core/types'

/**
 * Recommendations Unit Tests
 *
 * These tests exercise the platform-agnostic core stages of the recommendation
 * pipeline (scoring helpers, graph construction, item ranking, rotation
 * selection, and outfit grading) on hand-crafted fixtures. The goal is to
 * verify the math and decision gates independently of Hono/Drizzle.
 */

const TODAY = new Date('2026-05-13T00:00:00.000Z')

const cfg = (overrides: Partial<RecommendationConfig> = {}): RecommendationConfig =>
  withConfigOverrides(overrides)

const daysAgo = (days: number): Date => new Date(TODAY.getTime() - days * 24 * 60 * 60 * 1000)

const makeNode = (id: string, type: ItemNode['type'], freshness = 1, userRating = 2): ItemNode => ({
  id,
  type,
  freshness,
  lastWornAt: null,
  userRating,
})

describe('[Unit] scoring helpers', () => {
  test('ratingFactor maps to (-missPenalty, midWeight, 1.0)', () => {
    const c = cfg()
    expect(ratingFactor(0, c)).toBe(-c.missPenalty)
    expect(ratingFactor(1, c)).toBe(c.midWeight)
    expect(ratingFactor(2, c)).toBe(1.0)
  })

  test('recencyFactor is 1.0 at d=0, 0.5 at half-life, monotonically decreasing', () => {
    const c = cfg()
    expect(recencyFactor(TODAY, TODAY, c)).toBe(1.0)
    const halfLife = recencyFactor(daysAgo(c.recencyHalfLifeDays), TODAY, c)
    expect(halfLife).toBeCloseTo(0.5, 5)
    const closer = recencyFactor(daysAgo(c.recencyHalfLifeDays / 2), TODAY, c)
    const further = recencyFactor(daysAgo(c.recencyHalfLifeDays * 2), TODAY, c)
    expect(closer).toBeGreaterThan(halfLife)
    expect(further).toBeLessThan(halfLife)
  })

  test('recencyFactor returns ghost recency for null wearDate', () => {
    const c = cfg()
    expect(recencyFactor(null, TODAY, c)).toBe(c.ghostRecency)
  })

  test('edgeKey is canonical regardless of argument order', () => {
    expect(edgeKey('b', 'a')).toBe('a|b')
    expect(edgeKey('a', 'b')).toBe('a|b')
  })

  test('geomean of single value equals the value; zero input returns 0', () => {
    expect(geomean([2.5])).toBeCloseTo(2.5, 6)
    expect(geomean([4, 9])).toBeCloseTo(6, 6)
    expect(geomean([1, 0, 5])).toBe(0)
    expect(geomean([])).toBe(0)
  })
})

describe('[Unit] buildItemGraph', () => {
  test('edges accumulate hits and subtract misses, with anti-edge detection', () => {
    const config = cfg()
    const ids = ['a', 'b', 'c']
    const available = new Set(ids)
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 2, wearDate: daysAgo(10), itemIds: ['a', 'b'] },
      { id: 'o2', rating: 1, wearDate: daysAgo(20), itemIds: ['a', 'b'] },
      { id: 'o3', rating: 0, wearDate: daysAgo(5), itemIds: ['a', 'c'] },
      { id: 'o4', rating: 2, wearDate: null, itemIds: ['b', 'c'] },
    ]
    const graph = buildItemGraph(outfits, available, TODAY, config)

    const ab = getEdge(graph, 'a', 'b')
    const ac = getEdge(graph, 'a', 'c')
    const bc = getEdge(graph, 'b', 'c')

    const hitContribution = 1.0 * recencyFactor(daysAgo(10), TODAY, config)
    const midContribution = config.midWeight * recencyFactor(daysAgo(20), TODAY, config)
    const expectedAB = hitContribution + midContribution
    const expectedAC = -config.missPenalty * recencyFactor(daysAgo(5), TODAY, config)
    const expectedBC = 1.0 * config.ghostRecency

    expect(ab.rawWeight).toBeCloseTo(expectedAB, 6)
    expect(ab.weight).toBeCloseTo(expectedAB, 6)
    expect(ac.rawWeight).toBeCloseTo(expectedAC, 6)
    expect(ac.weight).toBe(0)
    expect(ac.rawWeight).toBeLessThan(config.antiEdgeThreshold)
    expect(bc.rawWeight).toBeCloseTo(expectedBC, 6)
  })
})

describe('[Unit] freshness curve', () => {
  test('never-worn item has max freshness', () => {
    const f = freshnessForItem('top', null, TODAY, DEFAULT_CONFIG.freshness)
    expect(f).toBe(DEFAULT_CONFIG.freshness.maxFreshness)
  })

  test('just-worn item has min freshness; freshness rises with days', () => {
    const fc = DEFAULT_CONFIG.freshness
    const todayWorn = freshnessForItem('top', TODAY, TODAY, fc)
    expect(todayWorn).toBe(fc.minFreshness)
    const oneDay = freshnessForItem('top', daysAgo(1), TODAY, fc)
    const fiveDay = freshnessForItem('top', daysAgo(5), TODAY, fc)
    expect(fiveDay).toBeGreaterThan(oneDay)
  })

  test('computeFreshnessMap returns max freshness for never-worn items', () => {
    const items = [
      { id: 'a', type: 'top' as const, userRating: 2 },
      { id: 'b', type: 'bottom' as const, userRating: 3 },
    ]
    const lw = new Map<string, Date>([['a', daysAgo(40)]])
    const map = computeFreshnessMap(items, lw, TODAY, DEFAULT_CONFIG.freshness)
    expect(map.size).toBe(2)
    expect(map.get('b')).toBe(DEFAULT_CONFIG.freshness.maxFreshness)
  })
})

describe('[Unit] rankItems', () => {
  test('starter-mode: returns ranking sorted by centrality × freshness × rating, never flags items', () => {
    const config = cfg()
    const nodes = [
      makeNode('a', 'top', 1.0, 2),
      makeNode('b', 'bottom', 0.5, 2),
      makeNode('c', 'footwear', 1.0, 4),
    ]
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 2, wearDate: daysAgo(10), itemIds: ['a', 'b', 'c'] },
      { id: 'o2', rating: 2, wearDate: daysAgo(20), itemIds: ['a', 'c'] },
    ]
    const edges = buildItemGraph(outfits, new Set(nodes.map((n) => n.id)), TODAY, config)
    const result = rankItems({
      nodes,
      edges,
      selectedItemIds: [],
      autocompleteCount: 1,
      corpusSize: 2,
      config,
    })
    expect(result.mode).toBe('starter')
    expect(result.autocompleteCount).toBe(0)
    expect(result.ranking.every((e) => e.isAutocomplete === false)).toBe(true)
    expect(result.autocompleteReason).toBe('starter_mode')
    expect(result.ranking.length).toBe(3)
  })

  test('composing-mode: anti-edge candidate is dropped (vetoed)', () => {
    const config = cfg({ antiEdgeThreshold: -0.1 })
    const nodes = [makeNode('a', 'top'), makeNode('b', 'bottom'), makeNode('c', 'footwear')]
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 0, wearDate: daysAgo(1), itemIds: ['a', 'c'] },
      { id: 'o2', rating: 0, wearDate: daysAgo(1), itemIds: ['a', 'c'] },
    ]
    const edges = buildItemGraph(outfits, new Set(nodes.map((n) => n.id)), TODAY, config)
    const result = rankItems({
      nodes,
      edges,
      selectedItemIds: ['a'],
      autocompleteCount: 1,
      corpusSize: 3,
      config,
    })
    expect(result.ranking.some((e) => e.itemId === 'c')).toBe(false)
    expect(result.ranking.some((e) => e.itemId === 'b')).toBe(true)
  })

  test('composing-mode: type-saturation demotes a second-of-type when slot is filled', () => {
    const config = cfg()
    const nodes = [
      makeNode('top1', 'top'),
      makeNode('top2', 'top'),
      makeNode('btm', 'bottom'),
      makeNode('shoe', 'footwear'),
    ]
    const outfits: CorpusOutfit[] = [
      {
        id: 'o1',
        rating: 2,
        wearDate: daysAgo(10),
        itemIds: ['top1', 'top2', 'btm', 'shoe'],
      },
      {
        id: 'o2',
        rating: 2,
        wearDate: daysAgo(15),
        itemIds: ['top1', 'btm', 'shoe'],
      },
    ]
    const edges = buildItemGraph(outfits, new Set(nodes.map((n) => n.id)), TODAY, config)
    const result = rankItems({
      nodes,
      edges,
      selectedItemIds: ['top1', 'btm', 'shoe'],
      autocompleteCount: 1,
      corpusSize: 2,
      config,
    })
    const top2 = result.ranking.find((e) => e.itemId === 'top2')
    expect(top2).toBeDefined()
  })

  test('cold-start: corpus smaller than min flags none, with reason corpus_too_small', () => {
    const config = cfg()
    const nodes = [makeNode('a', 'top'), makeNode('b', 'bottom'), makeNode('c', 'footwear')]
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 2, wearDate: daysAgo(10), itemIds: ['a', 'b', 'c'] },
    ]
    const edges = buildItemGraph(outfits, new Set(nodes.map((n) => n.id)), TODAY, config)
    const result = rankItems({
      nodes,
      edges,
      selectedItemIds: ['a'],
      autocompleteCount: 1,
      corpusSize: 1,
      config,
    })
    expect(result.autocompleteCount).toBe(0)
    expect(result.autocompleteReason).toBe('corpus_too_small')
  })

  test('composing-mode: when gates pass, top candidate is flagged', () => {
    const config = cfg({ scoreFloor: 0.0, minCorpusOutfits: 1 })
    const nodes = [makeNode('top1', 'top'), makeNode('btm', 'bottom'), makeNode('shoe', 'footwear')]
    const outfits: CorpusOutfit[] = [
      {
        id: 'o1',
        rating: 2,
        wearDate: daysAgo(5),
        itemIds: ['top1', 'btm', 'shoe'],
      },
      {
        id: 'o2',
        rating: 2,
        wearDate: daysAgo(15),
        itemIds: ['top1', 'btm', 'shoe'],
      },
      {
        id: 'o3',
        rating: 2,
        wearDate: daysAgo(25),
        itemIds: ['top1', 'btm', 'shoe'],
      },
    ]
    const edges = buildItemGraph(outfits, new Set(nodes.map((n) => n.id)), TODAY, config)
    const result = rankItems({
      nodes,
      edges,
      selectedItemIds: ['top1'],
      autocompleteCount: 1,
      corpusSize: 3,
      config,
    })
    expect(result.autocompleteCount).toBeGreaterThanOrEqual(1)
    expect(result.ranking[0].isAutocomplete).toBe(true)
  })
})

describe('[Unit] outfit-pool and selectRotation', () => {
  const counts: AvailableCounts = { layer: 1, top: 3, bottom: 3, footwear: 3, accessory: 0 }
  const buildNodes = (): ItemNode[] => [
    makeNode('t1', 'top'),
    makeNode('t2', 'top'),
    makeNode('t3', 'top'),
    makeNode('b1', 'bottom'),
    makeNode('b2', 'bottom'),
    makeNode('b3', 'bottom'),
    makeNode('s1', 'footwear'),
    makeNode('s2', 'footwear'),
    makeNode('s3', 'footwear'),
  ]

  test('empty pool returns no_eligible_outfits', () => {
    const config = cfg()
    const result = selectRotation({
      pool: [],
      edges: new Map(),
      availableCounts: counts,
      wardrobeSize: 9,
      requestedSize: 5,
      config,
    })
    expect(result.rotation).toEqual([])
    expect(result.reason).toBe('no_eligible_outfits')
  })

  test('disjoint outfits all get picked', () => {
    const config = cfg()
    const nodes = buildNodes()
    const ids = new Set(nodes.map((n) => n.id))
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 2, wearDate: daysAgo(30), itemIds: ['t1', 'b1', 's1'] },
      { id: 'o2', rating: 2, wearDate: daysAgo(40), itemIds: ['t2', 'b2', 's2'] },
      { id: 'o3', rating: 2, wearDate: daysAgo(50), itemIds: ['t3', 'b3', 's3'] },
    ]
    const freshness = new Map<string, number>()
    for (const n of nodes) freshness.set(n.id, 1.0)
    const edges = buildItemGraph(outfits, ids, TODAY, config)
    const pool = buildOutfitPool(outfits, nodes, ids, freshness, config)
    expect(pool.length).toBe(3)
    const result = selectRotation({
      pool,
      edges,
      availableCounts: counts,
      wardrobeSize: 9,
      requestedSize: 5,
      config,
    })
    expect(result.rotationSize).toBe(3)
    expect(new Set(result.rotation.map((r) => r.outfitId))).toEqual(new Set(['o1', 'o2', 'o3']))
  })

  test('overlap penalty suppresses heavy reuse of scarce items', () => {
    const config = cfg({ lambdaOverlap: 10.0 })
    const nodes = buildNodes()
    const tightCounts: AvailableCounts = { ...counts, top: 2, bottom: 2, footwear: 2 }
    const ids = new Set(nodes.map((n) => n.id))
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 2, wearDate: daysAgo(30), itemIds: ['t1', 'b1', 's1'] },
      { id: 'o2', rating: 2, wearDate: daysAgo(40), itemIds: ['t1', 'b1', 's1'] },
      { id: 'o3', rating: 2, wearDate: daysAgo(50), itemIds: ['t2', 'b2', 's2'] },
    ]
    const freshness = new Map<string, number>()
    for (const n of nodes) freshness.set(n.id, 1.0)
    const edges = buildItemGraph(outfits, ids, TODAY, config)
    const pool = buildOutfitPool(outfits, nodes, ids, freshness, config)
    const result = selectRotation({
      pool,
      edges,
      availableCounts: tightCounts,
      wardrobeSize: 6,
      requestedSize: 3,
      config,
    })
    expect(result.rotation.some((r) => r.outfitId === 'o3')).toBe(true)
  })

  test('rating-0 outfits never appear in pool', () => {
    const config = cfg()
    const nodes = buildNodes()
    const ids = new Set(nodes.map((n) => n.id))
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 0, wearDate: daysAgo(30), itemIds: ['t1', 'b1', 's1'] },
      { id: 'o2', rating: 2, wearDate: daysAgo(40), itemIds: ['t2', 'b2', 's2'] },
    ]
    const freshness = new Map<string, number>()
    for (const n of nodes) freshness.set(n.id, 1.0)
    const pool = buildOutfitPool(outfits, nodes, ids, freshness, config)
    expect(pool.map((p) => p.outfit.id)).toEqual(['o2'])
  })

  test('outfits referencing unavailable items are filtered out', () => {
    const config = cfg()
    const nodes = buildNodes()
    const availableIds = new Set(['t1', 'b1', 's1'])
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 2, wearDate: daysAgo(30), itemIds: ['t1', 'b1', 's1'] },
      { id: 'o2', rating: 2, wearDate: daysAgo(40), itemIds: ['t2', 'b2', 's2'] },
    ]
    const freshness = new Map<string, number>()
    for (const n of nodes) freshness.set(n.id, 1.0)
    const pool = buildOutfitPool(outfits, nodes, availableIds, freshness, config)
    expect(pool.map((p) => p.outfit.id)).toEqual(['o1'])
  })

  test('repeats field reports items that appear in more than one selected outfit', () => {
    const config = cfg({ lambdaOverlap: 0 })
    const nodes = buildNodes()
    const ids = new Set(nodes.map((n) => n.id))
    const outfits: CorpusOutfit[] = [
      { id: 'o1', rating: 2, wearDate: daysAgo(30), itemIds: ['t1', 'b1', 's1'] },
      { id: 'o2', rating: 2, wearDate: daysAgo(40), itemIds: ['t1', 'b2', 's2'] },
    ]
    const freshness = new Map<string, number>()
    for (const n of nodes) freshness.set(n.id, 1.0)
    const edges = buildItemGraph(outfits, ids, TODAY, config)
    const pool = buildOutfitPool(outfits, nodes, ids, freshness, config)
    const result = selectRotation({
      pool,
      edges,
      availableCounts: counts,
      wardrobeSize: 9,
      requestedSize: 5,
      config,
    })
    expect(result.rotation.length).toBe(2)
    const allRepeats = result.rotation.map((r) => r.repeats)
    expect(allRepeats.every((r) => r['t1'] === 2)).toBe(true)
    expect(allRepeats.every((r) => r['b1'] === undefined)).toBe(true)
  })
})

describe('[Unit] gradeOutfit', () => {
  const corpusSize = 5

  test('letter mapping is monotonic across thresholds', () => {
    expect(letterFor(0.96)).toBe('A+')
    expect(letterFor(0.9)).toBe('A')
    expect(letterFor(0.8)).toBe('B+')
    expect(letterFor(0.7)).toBe('B')
    expect(letterFor(0.6)).toBe('C+')
    expect(letterFor(0.5)).toBe('C')
    expect(letterFor(0.3)).toBe('D')
    expect(letterFor(0.1)).toBe('F')
  })

  test('fresh items + no recent overlap → high grade', () => {
    const nodes = [
      makeNode('a', 'top', 1.0),
      makeNode('b', 'bottom', 1.0),
      makeNode('c', 'footwear', 1.0),
    ]
    const grade = gradeOutfit({
      outfitItemIds: ['a', 'b', 'c'],
      nodes,
      recentOutfits: [],
      today: TODAY,
      corpusSize,
      config: cfg(),
    })
    expect(grade.score).toBeGreaterThanOrEqual(0.95)
    expect(grade.grade).toBe('A+')
  })

  test('outfit identical to a recent outfit drops cohorrence', () => {
    const nodes = [
      makeNode('a', 'top', 1.0),
      makeNode('b', 'bottom', 1.0),
      makeNode('c', 'footwear', 1.0),
    ]
    const recent: CorpusOutfit[] = [
      { id: 'rO', rating: 2, wearDate: daysAgo(1), itemIds: ['a', 'b', 'c'] },
    ]
    const grade = gradeOutfit({
      outfitItemIds: ['a', 'b', 'c'],
      nodes,
      recentOutfits: recent,
      today: TODAY,
      corpusSize,
      config: cfg(),
    })
    expect(grade.cohorrenceTerm).toBeCloseTo(0, 6)
    expect(grade.mostRecentOverlap?.outfitId).toBe('rO')
    expect(grade.mostRecentOverlap?.daysAgo).toBe(1)
  })

  test('cold-start forces cohorrence to 1.0 and flags coldStart=true', () => {
    const nodes = [
      makeNode('a', 'top', 1.0),
      makeNode('b', 'bottom', 1.0),
      makeNode('c', 'footwear', 1.0),
    ]
    const recent: CorpusOutfit[] = [
      { id: 'rO', rating: 2, wearDate: daysAgo(1), itemIds: ['a', 'b', 'c'] },
    ]
    const grade = gradeOutfit({
      outfitItemIds: ['a', 'b', 'c'],
      nodes,
      recentOutfits: recent,
      today: TODAY,
      corpusSize: 1,
      config: cfg(),
    })
    expect(grade.coldStart).toBe(true)
    expect(grade.cohorrenceTerm).toBe(1.0)
  })

  test('outfit with low minimum freshness drops the freshness term', () => {
    const nodes = [
      makeNode('a', 'top', 0.05),
      makeNode('b', 'bottom', 1.0),
      makeNode('c', 'footwear', 1.0),
    ]
    const grade = gradeOutfit({
      outfitItemIds: ['a', 'b', 'c'],
      nodes,
      recentOutfits: [],
      today: TODAY,
      corpusSize,
      config: cfg(),
    })
    expect(grade.minFreshness).toBeCloseTo(0.05, 6)
    expect(grade.freshnessTerm).toBeLessThan(0.5)
  })
})
