import type { ItemRepository } from '../repositories/ItemRepository'
import type {
  OutfitPaginationOptions,
  OutfitRepository,
  OutfitSuggestionsOptions,
  OutfitWithDetails,
} from '../repositories/OutfitRepository'
import { VIRTUAL_TAGS, getApplicableVirtualTags, isVirtualTag } from './TagService'

export class OutfitService {
  constructor(
    private outfitRepository: OutfitRepository,
    private itemRepository: ItemRepository
  ) {}

  async getAllOutfits(userId: string, pagination?: OutfitPaginationOptions) {
    const pageNumber = pagination?.page || 0
    const pageSize = pagination?.size || 10

    const outfitsData = await this.outfitRepository.findAll(userId, {
      page: pageNumber,
      size: pageSize,
    })

    const last_page = !(outfitsData.length > pageSize)
    if (!last_page) outfitsData.pop()

    return {
      outfits: outfitsData,
      last_page,
    }
  }

  async createOutfit(userId: string, data: any) {
    return this.outfitRepository.create(userId, data)
  }

  async deleteOutfit(userId: string, outfitId: string) {
    return this.outfitRepository.delete(userId, outfitId)
  }

  async getOutfitsByTag(userId: string, tagId: string) {
    // Handle virtual tags
    if (isVirtualTag(tagId)) {
      const virtualTag = VIRTUAL_TAGS[tagId]
      if (!virtualTag) return []

      const allOutfits = await this.outfitRepository.findAll(userId)
      return allOutfits.filter((outfit) => virtualTag.appliesTo && virtualTag.appliesTo(outfit))
    }

    // Handle regular tags - this would need a new repository method
    // For now, return empty array as this is complex query logic
    return []
  }

  async getFlattenedOutfits(userId: string) {
    // Get all worn outfits with full details
    const allOutfits = await this.outfitRepository.findAll(userId)

    // Apply the same deduplication logic as the suggestions algorithm
    const coreItemsMap = new Map()
    const mostRecentByCoreItems = new Map()

    // First pass: Group outfits by core items and find the most recent for each group
    for (const outfit of allOutfits) {
      // Extract only layers, tops, and bottoms - not accessories or footwear
      const coreItems = outfit.outfitItems
        .filter((io) => ['layer', 'top', 'bottom'].includes(io.itemType))
        .map((io) => io.itemId)
        .sort() // Sort to ensure consistent order

      // Skip if no core items
      if (coreItems.length === 0) continue

      // Create a key for this combination of core items
      const coreItemsKey = coreItems.join('|')

      // Add this outfit to the map of outfits with these core items
      if (!coreItemsMap.has(coreItemsKey)) {
        coreItemsMap.set(coreItemsKey, [outfit])
        mostRecentByCoreItems.set(coreItemsKey, outfit)
      } else {
        coreItemsMap.get(coreItemsKey).push(outfit)

        // Check if this outfit is more recent than the currently stored one
        const currentMostRecent = mostRecentByCoreItems.get(coreItemsKey)
        const outfitDate = outfit.wearDate ? new Date(outfit.wearDate) : new Date(0)
        const currentMostRecentDate = currentMostRecent.wearDate
          ? new Date(currentMostRecent.wearDate)
          : new Date(0)
        if (outfitDate > currentMostRecentDate) {
          mostRecentByCoreItems.set(coreItemsKey, outfit)
        }
      }
    }

    // Second pass: Filter outfits to keep only the most recent for each core items group
    const uniqueOutfits = allOutfits.filter((outfit) => {
      const coreItems = outfit.outfitItems
        .filter((io) => ['layer', 'top', 'bottom'].includes(io.itemType))
        .map((io) => io.itemId)
        .sort()

      // If this outfit has no core items, keep it (it's unique)
      if (coreItems.length === 0) return true

      const coreItemsKey = coreItems.join('|')
      const mostRecent = mostRecentByCoreItems.get(coreItemsKey)

      // Keep this outfit only if it's the most recent one with these core items
      return outfit.id === mostRecent.id
    })

    // Add virtual tags to each outfit and return
    return uniqueOutfits.map((outfit) => {
      const applicableVirtualTags = getApplicableVirtualTags(outfit)
      const allTags = [
        ...outfit.outfitTags,
        ...applicableVirtualTags.map((vTag) => ({
          tagId: vTag.id,
          status: 'manually_assigned' as const,
          tag: vTag,
        })),
      ]

      return {
        ...outfit,
        outfitTags: allTags,
      }
    })
  }

  async getSuggestions(userId: string, options?: OutfitSuggestionsOptions) {
    const pageNumber = options?.page || 0
    const pageSize = options?.size || 10
    const tagId = options?.tagId
    const today = new Date()

    // Handle filtering by virtual tags
    const isVirtualTagFilter = tagId ? isVirtualTag(tagId) : false
    const virtualTag = isVirtualTagFilter ? VIRTUAL_TAGS[tagId!] : undefined
    const regularTagId = isVirtualTagFilter ? undefined : tagId

    // STEP 1: Get all available items with last worn dates in a single query
    const allItems = await this.outfitRepository.getAvailableItems(userId)

    // Get a list of non-available item IDs for checking if outfits contain unavailable items
    const unavailableItems = await this.outfitRepository.getUnavailableItems(userId)

    // Create a Set of unavailable item IDs for efficient lookup
    const unavailableItemIds = new Set(unavailableItems.map((item) => item.id))

    // Calculate recency threshold (min count of items per category)
    const wardrobeCounts = {
      total: allItems.length,
      layer: allItems.filter((i) => i.type === 'layer').length,
      top: allItems.filter((i) => i.type === 'top').length,
      bottom: allItems.filter((i) => i.type === 'bottom').length,
      footwear: allItems.filter((i) => i.type === 'footwear').length,
      accessory: allItems.filter((i) => i.type === 'accessory').length,
    }

    // Global minimum threshold for very small wardrobes
    const minRecencyThreshold = 3

    // Multiplier for the threshold
    const thresholdMultiplier = 0.75

    // Calculate type-specific recency thresholds
    const recencyThresholds = {
      layer: Math.max(wardrobeCounts.layer * thresholdMultiplier || 7, minRecencyThreshold),
      top: Math.max(wardrobeCounts.top * thresholdMultiplier || 7, minRecencyThreshold),
      bottom: Math.max(wardrobeCounts.bottom * thresholdMultiplier || 7, minRecencyThreshold),
      footwear: Math.max(wardrobeCounts.footwear * thresholdMultiplier || 7, minRecencyThreshold),
      accessory: Math.max(wardrobeCounts.accessory * thresholdMultiplier || 7, minRecencyThreshold),
      default: 7, // Default threshold for unknown types
    }

    // STEP 2: Get the last worn date for each item in a single query
    const itemLastWorn = await this.outfitRepository.getItemLastWornDates(userId)

    // Create a map of item ID to last worn date
    const itemLastWornMap = new Map()
    for (const row of itemLastWorn.rows || []) {
      itemLastWornMap.set(row.item_id, row.last_worn_date)
    }

    // Calculate freshness factor for each item (0.1 to 1.0)
    const itemFreshnessMap = new Map()
    for (const item of allItems) {
      const lastWornDate = itemLastWornMap.get(item.id)
      const itemType = item.type as keyof typeof recencyThresholds

      // Use type-specific recency threshold
      const typeRecencyThreshold = recencyThresholds[itemType] || recencyThresholds.default

      if (!lastWornDate) {
        // Item never worn - maximum freshness
        itemFreshnessMap.set(item.id, 1.0)
        continue
      }

      const daysSinceWorn = Math.floor(
        (today.getTime() - new Date(lastWornDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Parameters that control the curve shape
      const minFreshness = 0.01 // Minimum freshness for very recently worn items
      const maxFreshness = 1.0 // Maximum freshness
      const risePhase = typeRecencyThreshold // Days it takes to reach peak freshness - now type-specific
      const plateauPhase = typeRecencyThreshold // Days the freshness stays at peak
      const degradationRate = 0.05 // How quickly freshness decreases after plateau (per day)

      let freshnessFactor
      if (daysSinceWorn <= 0) {
        // Just worn today
        freshnessFactor = minFreshness
      } else if (daysSinceWorn < risePhase) {
        // S-curve using logistic function for rising phase
        // Has flat beginning and gradual approach to peak
        const progress = daysSinceWorn / risePhase

        // Logistic function parameters
        const steepness = 7.0 // Slightly reduced steepness for a more gradual curve
        const midpoint = 0.7 // Shifted further right to extend the flat beginning

        // Logistic function: 1 / (1 + e^(-steepness * (x - midpoint)))
        const logisticValue = 1 / (1 + Math.exp(-steepness * (progress - midpoint)))

        // Normalize to ensure we start at minFreshness and end exactly at maxFreshness
        // We need to calculate what the logistic function outputs at progress=0 and progress=1
        const startValue = 1 / (1 + Math.exp(-steepness * (0 - midpoint)))
        const endValue = 1 / (1 + Math.exp(-steepness * (1 - midpoint)))

        // Normalize the output
        const normalizedValue = (logisticValue - startValue) / (endValue - startValue)

        freshnessFactor = minFreshness + (maxFreshness - minFreshness) * normalizedValue
      } else if (daysSinceWorn < risePhase + plateauPhase) {
        // Plateau phase: maintain maximum freshness
        freshnessFactor = maxFreshness
      } else {
        // Linear degradation phase
        const daysAfterPlateau = daysSinceWorn - (risePhase + plateauPhase)
        const degradation = daysAfterPlateau * degradationRate
        freshnessFactor = Math.max(minFreshness, maxFreshness - degradation)
      }

      itemFreshnessMap.set(item.id, freshnessFactor)
    }

    // STEP 3: Get all eligible outfits in a single query
    const eligibleOutfits = await this.outfitRepository.findEligibleForSuggestions(userId, 1)

    // Filter out outfits that contain any unavailable items
    const availableOutfits = eligibleOutfits.filter((outfit) => {
      // Return true only if no items in the outfit are unavailable
      return !outfit.outfitItems.some((io) => unavailableItemIds.has(io.itemId))
    })

    // If no eligible outfits after filtering unavailable items, return empty result
    if (availableOutfits.length === 0) {
      return {
        suggestions: [],
        generated_at: today,
        metadata: {
          wardrobe_size: allItems.length,
          recency_threshold: recencyThresholds,
          last_page: true,
          algorithm_version: 'v2',
          filter_applied: 'no_eligible_outfits_or_all_contain_unavailable_items',
        },
      }
    }

    // Filter outfits to only include those with at least one layer/top, one bottom, and one footwear
    // And apply tag filter if provided
    const completeOutfits = availableOutfits.filter((outfit) => {
      const hasTopOrLayer = outfit.outfitItems.some(
        (io) => io.itemType === 'top' || io.itemType === 'layer'
      )
      const hasBottom = outfit.outfitItems.some((io) => io.itemType === 'bottom')
      const hasFootwear = outfit.outfitItems.some((io) => io.itemType === 'footwear')

      // Check for virtual tag filter
      const matchesVirtualTagFilter =
        !virtualTag || (virtualTag.appliesTo && virtualTag.appliesTo(outfit))

      // If regular tagId is provided, check if the outfit has this tag
      const hasTag = !regularTagId || outfit.outfitTags.some((to) => to.tagId === regularTagId)

      return hasTopOrLayer && hasBottom && hasFootwear && hasTag && matchesVirtualTagFilter
    })

    // If no complete outfits after filtering, return empty result
    if (completeOutfits.length === 0) {
      return {
        suggestions: [],
        generated_at: today,
        metadata: {
          wardrobe_size: allItems.length,
          recency_threshold: recencyThresholds,
          last_page: true,
          algorithm_version: 'v2',
          filter_applied: 'complete_outfits_only',
        },
      }
    }

    // STEP 4: Filter out outfits with identical core items, keeping only the most recent
    // Track outfits with the same core items (layers, tops, bottoms only)
    const coreItemsMap = new Map()
    const mostRecentByCoreItems = new Map()

    // First pass: Group outfits by core items and find the most recent for each group
    for (const outfit of completeOutfits) {
      // Extract only layers, tops, and bottoms - not accessories or footwear
      const coreItems = outfit.outfitItems
        .filter((io) => ['layer', 'top', 'bottom'].includes(io.itemType))
        .map((io) => io.itemId)
        .sort() // Sort to ensure consistent order

      // Skip if no core items
      if (coreItems.length === 0) continue

      // Create a key for this combination of core items
      const coreItemsKey = coreItems.join('|')

      // Add this outfit to the map of outfits with these core items
      if (!coreItemsMap.has(coreItemsKey)) {
        coreItemsMap.set(coreItemsKey, [outfit])
        mostRecentByCoreItems.set(coreItemsKey, outfit)
      } else {
        coreItemsMap.get(coreItemsKey).push(outfit)

        // Check if this outfit is more recent than the currently stored one
        const currentMostRecent = mostRecentByCoreItems.get(coreItemsKey)
        const outfitDate = outfit.wearDate ? new Date(outfit.wearDate) : new Date(0)
        const currentMostRecentDate = currentMostRecent.wearDate
          ? new Date(currentMostRecent.wearDate)
          : new Date(0)
        if (outfitDate > currentMostRecentDate) {
          mostRecentByCoreItems.set(coreItemsKey, outfit)
        }
      }
    }

    // Second pass: Filter outfits to keep only the most recent for each core items group
    const uniqueOutfits = completeOutfits.filter((outfit) => {
      const coreItems = outfit.outfitItems
        .filter((io) => ['layer', 'top', 'bottom'].includes(io.itemType))
        .map((io) => io.itemId)
        .sort()

      // If this outfit has no core items, keep it (it's unique)
      if (coreItems.length === 0) return true

      const coreItemsKey = coreItems.join('|')
      const mostRecent = mostRecentByCoreItems.get(coreItemsKey)

      // Keep this outfit only if it's the most recent one with these core items
      return outfit.id === mostRecent.id
    })

    // Calculate wear counts for the filtered outfits
    const wearCountsMap = new Map()

    // For each filtered outfit, set its wear count to the total number of outfits with the same core items
    for (const outfit of uniqueOutfits) {
      const coreItems = outfit.outfitItems
        .filter((io) => ['layer', 'top', 'bottom'].includes(io.itemType))
        .map((io) => io.itemId)
        .sort()

      if (coreItems.length === 0) {
        wearCountsMap.set(outfit.id, 1) // Unique outfit
        continue
      }

      const coreItemsKey = coreItems.join('|')
      const totalWithSameCoreItems = coreItemsMap.get(coreItemsKey)?.length || 1

      // Set wear count to the total number of times this combination has been worn
      wearCountsMap.set(outfit.id, totalWithSameCoreItems)
    }

    // STEP 5: Score each outfit
    const scoredOutfits = uniqueOutfits.map((outfit) => {
      // Rating Score (0-10)
      const ratingScore = outfit.rating === 2 ? 10 : 3 // Rating 1 = 3, Rating 2 = 10

      // Time Score (0-30)
      const outfitDate = outfit.wearDate ? new Date(outfit.wearDate) : new Date(0)
      const daysSinceWorn = Math.floor(
        (today.getTime() - outfitDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Get item freshness for all items in this outfit
      const itemIds = outfit.outfitItems.map((io) => io.itemId)
      const nonAccessoryItems = outfit.outfitItems.filter((io) => io.itemType !== 'accessory')

      if (itemIds.length === 0) {
        // Empty outfit case - just return rating score
        return {
          outfitId: outfit.id,
          totalScore: ratingScore,
          scoring_details: {
            ratingScore,
            timeScore: 0,
            frequencyScore: 0,
            rawData: {
              daysSinceWorn,
              itemCount: 0,
              nonAccessoryItemCount: 0,
              wearCount: 1,
              avgItemFreshness: 0,
              minItemFreshness: 1.0,
              recentlyWornItems: 0,
              outfitFreshness: 1.0,
              wardrobeRatios: {
                layer: (wardrobeCounts.layer || 0) / wardrobeCounts.total,
                top: (wardrobeCounts.top || 0) / wardrobeCounts.total,
                bottom: (wardrobeCounts.bottom || 0) / wardrobeCounts.total,
                footwear: (wardrobeCounts.footwear || 0) / wardrobeCounts.total,
              },
            },
          },
        }
      }

      // Calculate average freshness of all items
      let totalFreshness = 0
      let minFreshness = 1.0
      let recentlyWornCount = 0

      for (const itemId of itemIds) {
        const itemFreshness = itemFreshnessMap.get(itemId) || 1.0
        totalFreshness += itemFreshness

        // Track minimum freshness to penalize very recently worn items
        minFreshness = Math.min(minFreshness, itemFreshness)

        // Count recently worn items (freshness < 0.4)
        if (itemFreshness < 0.4) {
          recentlyWornCount++
        }
      }

      const avgFreshness = totalFreshness / itemIds.length

      // Amplify the impact of low freshness items using a power function
      // This will reduce scores more severely when freshness is low
      const amplifiedMinFreshness = Math.pow(minFreshness, 1.5)

      // Calculate outfit freshness using a modified approach that emphasizes minimum freshness:
      // - 60% weight to average freshness (overall outfit freshness)
      // - 40% weight to amplified minimum freshness (significantly penalizes very recently worn items)
      const finalFreshness = 0.6 * avgFreshness + 0.4 * amplifiedMinFreshness

      // Time Score (0-40) based directly on finalFreshness
      const timeScore = Math.round(finalFreshness * 40)

      // Frequency Score (0-10)
      const wearCount = wearCountsMap.get(outfit.id) || 1

      // Simplified frequency score based on wear count
      let frequencyScore = 0
      if (wearCount === 1)
        frequencyScore = 10 // Worn once: maximum score
      else if (wearCount === 2)
        frequencyScore = 7 // Worn twice
      else if (wearCount === 3)
        frequencyScore = 4 // Worn three times
      else if (wearCount === 4) frequencyScore = 2 // Worn four times

      // Total score
      const totalScore = ratingScore + timeScore + frequencyScore

      return {
        outfitId: outfit.id,
        totalScore,
        scoring_details: {
          ratingScore,
          timeScore,
          frequencyScore,
          rawData: {
            daysSinceWorn,
            itemCount: itemIds.length,
            nonAccessoryItemCount: nonAccessoryItems.length,
            wearCount,
            avgItemFreshness: avgFreshness.toFixed(3),
            minItemFreshness: minFreshness.toFixed(3),
            recentlyWornItems: recentlyWornCount,
            outfitFreshness: finalFreshness.toFixed(3),
            wardrobeRatios: {
              layer: (wardrobeCounts.layer || 0) / wardrobeCounts.total,
              top: (wardrobeCounts.top || 0) / wardrobeCounts.total,
              bottom: (wardrobeCounts.bottom || 0) / wardrobeCounts.total,
              footwear: (wardrobeCounts.footwear || 0) / wardrobeCounts.total,
            },
          },
        },
      }
    })

    // STEP 6: Sort by score and paginate
    const sortedOutfits = scoredOutfits.sort((a, b) => {
      // Sort by time score (higher is better)
      if (b.scoring_details.timeScore !== a.scoring_details.timeScore) {
        return b.scoring_details.timeScore - a.scoring_details.timeScore
      }

      // Then by rating score (higher is better)
      if (b.scoring_details.ratingScore !== a.scoring_details.ratingScore) {
        return b.scoring_details.ratingScore - a.scoring_details.ratingScore
      }

      // Then by frequency score (lower is better)
      return a.scoring_details.frequencyScore - b.scoring_details.frequencyScore
    })

    const paginatedOutfits = sortedOutfits.slice(
      pageNumber * pageSize,
      pageNumber * pageSize + pageSize + 1
    )

    // Check for last page
    const last_page = !(paginatedOutfits.length > pageSize)
    if (!last_page) paginatedOutfits.pop()

    // STEP 7: Fetch full details for the paginated outfits in a single query
    const outfitIds = paginatedOutfits.map((o) => o.outfitId)
    const outfitDetails = await this.outfitRepository.findWithFullDetails(userId, outfitIds)

    // Combine the outfit details with their scores
    const outfitsWithScores = outfitDetails
      .map((outfit) => {
        const scoreInfo = paginatedOutfits.find((s) => s.outfitId === outfit.id)

        // Add freshness score to each item
        const outfitItemsWithFreshness = outfit.outfitItems.map((item) => {
          const freshness = itemFreshnessMap.get(item.itemId) || 1.0
          return {
            ...item,
            freshness: parseFloat(freshness.toFixed(3)),
          }
        })

        // Add applicable virtual tags to the outfit
        const outfitTags = [...outfit.outfitTags]
        const applicableVirtualTags = getApplicableVirtualTags(outfit)

        // Add all applicable virtual tags to this outfit
        for (const virtualTag of applicableVirtualTags) {
          outfitTags.push({
            tagId: virtualTag.id,
            status: 'manually_assigned',
          })
        }

        return {
          ...outfit,
          outfitItems: outfitItemsWithFreshness,
          outfitTags,
          scoringDetails: scoreInfo?.scoring_details || {
            ratingScore: 0,
            timeScore: 0,
            frequencyScore: 0,
            rawData: {
              daysSinceWorn: 0,
              itemCount: 0,
              nonAccessoryItemCount: 0,
              wearCount: 0,
              avgItemFreshness: 0,
              minItemFreshness: 1.0,
              recentlyWornItems: 0,
              outfitFreshness: 1.0,
              wardrobeRatios: {
                layer: (wardrobeCounts.layer || 0) / wardrobeCounts.total,
                top: (wardrobeCounts.top || 0) / wardrobeCounts.total,
                bottom: (wardrobeCounts.bottom || 0) / wardrobeCounts.total,
                footwear: (wardrobeCounts.footwear || 0) / wardrobeCounts.total,
              },
            },
          },
          totalScore: scoreInfo?.totalScore || 0,
        }
      })
      .sort((a, b) => {
        // Sort by time score (higher is better)
        if (b.scoringDetails.timeScore !== a.scoringDetails.timeScore) {
          return b.scoringDetails.timeScore - a.scoringDetails.timeScore
        }

        // Then by rating score (higher is better)
        if (b.scoringDetails.ratingScore !== a.scoringDetails.ratingScore) {
          return b.scoringDetails.ratingScore - a.scoringDetails.ratingScore
        }

        // Then by frequency score (lower is better)
        return a.scoringDetails.frequencyScore - b.scoringDetails.frequencyScore
      })

    // Return the final result
    return {
      suggestions: outfitsWithScores,
      generated_at: today,
      metadata: {
        wardrobe_size: allItems.length,
        recency_threshold: recencyThresholds,
        last_page,
        algorithm_version: 'v2',
        filter_applied: isVirtualTagFilter
          ? 'virtual_tag_filter'
          : regularTagId
            ? 'tag_filter'
            : 'complete_outfits_only',
        virtual_tag_name: isVirtualTagFilter ? VIRTUAL_TAGS[tagId!]?.name : undefined,
        tagId: tagId || undefined,
      },
    }
  }
}
