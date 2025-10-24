import type { DBVariables } from '../utils/inject-db'

export interface WeatherRangeInput {
  location: string
  startDate: string
  endDate: string
}

export interface WeatherData {
  date: string
  tempHigh: number
  tempLow: number
  conditions: string
}

/**
 * Handles weather data retrieval and forecasting.
 */
export class WeatherService {
  constructor(private db: DBVariables['db']) {}

  /**
   * Retrieve weather forecast for a date range.
   *
   * @param {WeatherRangeInput} input - Location and date range
   * @returns {Promise<WeatherData[]>} - Array of daily weather forecasts
   * @example weatherRange({ location: "Seattle", startDate: "2025-01-01", endDate: "2025-01-07" })
   */
  async weatherRange(input: WeatherRangeInput): Promise<WeatherData[]> {
    const { location, startDate, endDate } = input
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const weatherData: WeatherData[] = []

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start)
      currentDate.setDate(start.getDate() + i)

      const dateStr = currentDate.toISOString().split('T')[0]
      const month = currentDate.getMonth() + 1 // 1-12

      // Generate realistic seasonal weather patterns
      const { tempHigh, tempLow, conditions } = this.generateSeasonalWeather(location, month)

      weatherData.push({
        date: dateStr,
        tempHigh,
        tempLow,
        conditions,
      })
    }

    return weatherData
  }

  /**
   * Generate realistic seasonal weather patterns for different cities
   */
  private generateSeasonalWeather(
    location: string,
    month: number
  ): { tempHigh: number; tempLow: number; conditions: string } {
    const city = location.toLowerCase()

    // Base seasonal patterns by month
    const seasonalPatterns = {
      // Winter months (Dec, Jan, Feb)
      12: { baseTemp: 35, variation: 15, rainChance: 0.4 },
      1: { baseTemp: 32, variation: 18, rainChance: 0.3 },
      2: { baseTemp: 38, variation: 16, rainChance: 0.35 },
      // Spring months (Mar, Apr, May)
      3: { baseTemp: 50, variation: 20, rainChance: 0.45 },
      4: { baseTemp: 60, variation: 18, rainChance: 0.4 },
      5: { baseTemp: 70, variation: 15, rainChance: 0.3 },
      // Summer months (Jun, Jul, Aug)
      6: { baseTemp: 78, variation: 12, rainChance: 0.2 },
      7: { baseTemp: 82, variation: 10, rainChance: 0.15 },
      8: { baseTemp: 80, variation: 12, rainChance: 0.2 },
      // Fall months (Sep, Oct, Nov)
      9: { baseTemp: 72, variation: 15, rainChance: 0.25 },
      10: { baseTemp: 60, variation: 18, rainChance: 0.35 },
      11: { baseTemp: 45, variation: 20, rainChance: 0.4 },
    }

    const pattern = seasonalPatterns[month as keyof typeof seasonalPatterns]

    // City-specific adjustments
    const cityAdjustments: Record<string, { tempModifier: number; rainModifier: number }> = {
      miami: { tempModifier: 15, rainModifier: 0.1 },
      'los angeles': { tempModifier: 8, rainModifier: -0.2 },
      seattle: { tempModifier: -5, rainModifier: 0.3 },
      chicago: { tempModifier: -8, rainModifier: 0.1 },
      'new york': { tempModifier: -2, rainModifier: 0.05 },
      denver: { tempModifier: -10, rainModifier: -0.1 },
      phoenix: { tempModifier: 12, rainModifier: -0.3 },
      boston: { tempModifier: -3, rainModifier: 0.1 },
      paris: { tempModifier: -5, rainModifier: 0.2 },
      london: { tempModifier: -8, rainModifier: 0.4 },
      tokyo: { tempModifier: 2, rainModifier: 0.2 },
      sydney: { tempModifier: 5, rainModifier: 0.1 },
    }

    const adjustment = cityAdjustments[city] || { tempModifier: 0, rainModifier: 0 }

    // Generate temperature with variation
    const baseTemp = pattern.baseTemp + adjustment.tempModifier
    const tempVariation = (Math.random() - 0.5) * pattern.variation
    const tempHigh = Math.round(baseTemp + tempVariation + 8)
    const tempLow = Math.round(baseTemp + tempVariation - 8)

    // Generate conditions
    const rainChance = Math.max(0, Math.min(1, pattern.rainChance + adjustment.rainModifier))
    const isRainy = Math.random() < rainChance
    const isCloudy = Math.random() < 0.3

    let conditions = 'sunny'
    if (isRainy) {
      conditions = Math.random() < 0.3 ? 'heavy rain' : 'light rain'
    } else if (isCloudy) {
      conditions = 'cloudy'
    }

    return { tempHigh, tempLow, conditions }
  }
}
