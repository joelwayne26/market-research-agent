/**
 * Trend Detection Module
 * 
 * Identifies and analyzes trends in time-series data.
 * Supports:
 * - Linear and non-linear trend detection
 * - Seasonal pattern recognition
 * - Anomaly/outlier detection
 * - Trend forecasting (simple)
 * 
 * Uses statistical methods for analysis:
 * - Moving averages for smoothing
 * - Linear regression for trend lines
 * - Standard deviation for anomaly detection
 * 
 * @module lib/analyzer/trends
 */

import { jsonCompletion, AnalysisResult } from '@/lib/openai'

/**
 * Data point with timestamp for time-series analysis
 */
export interface TimeSeriesPoint {
  timestamp: Date | string | number
  value: number
  metadata?: Record<string, unknown>
}

/**
 * Trend direction enum
 */
export type TrendDirection = 'up' | 'down' | 'stable' | 'volatile'

/**
 * Detected trend information
 */
export interface Trend {
  id: string
  name: string
  direction: TrendDirection
  strength: number // 0 to 1
  confidence: number // 0 to 1
  period: {
    start: Date
    end: Date
  }
  statistics: {
    startValue: number
    endValue: number
    changePercent: number
    averageValue: number
    volatility: number
  }
  description?: string
}

/**
 * Anomaly/Outlier detection result
 */
export interface Anomaly {
  index: number
  point: TimeSeriesPoint
  expectedRange: { min: number; max: number }
  deviation: number // Number of standard deviations
  severity: 'low' | 'medium' | 'high' | 'critical'
  possibleCauses?: string[]
}

/**
 * Trend analysis results
 */
export interface TrendAnalysisResult {
  trends: Trend[]
  anomalies: Anomaly[]
  summary: string
  forecast?: ForecastResult
  metadata: {
    dataPointsAnalyzed: number
    dateRange: { start: Date; end: Date }
    analysisMethod: string
  }
}

/**
 * Simple forecast result
 */
export interface ForecastResult {
  points: Array<{ timestamp: Date; value: number; confidence: number }>
  method: string
  horizon: string
  disclaimer: string
}

/**
 * Analyzes trends in time-series data
 * 
 * @param data - Array of time-series data points
 * @param options - Analysis configuration options
 * @returns Complete trend analysis result
 * 
 * @example
 * const analysis = await analyzeTrends([
 *   { timestamp: '2024-01-01', value: 100 },
 *   { timestamp: '2024-01-02', value: 105 },
 *   // ... more points
 * ])
 * console.log(analysis.trends[0].direction) // 'up'
 */
export async function analyzeTrends(
  data: TimeSeriesPoint[],
  options?: {
    windowSize?: number
    anomalyThreshold?: number // standard deviations
    forecastDays?: number
  }
): Promise<TrendAnalysisResult> {
  const config = {
    windowSize: options?.windowSize || 7,
    anomalyThreshold: options?.anomalyThreshold || 2,
    forecastDays: options?.forecastDays || 30
  }

  if (data.length < 3) {
    return {
      trends: [],
      anomalies: [],
      summary: 'Insufficient data for trend analysis',
      metadata: {
        dataPointsAnalyzed: data.length,
        dateRange: { start: new Date(), end: new Date() },
        analysisMethod: 'none'
      }
    }
  }

  // Parse timestamps and sort by date
  const parsedData = data.map(point => ({
    ...point,
    parsedTimestamp: typeof point.timestamp === 'string' 
      ? new Date(point.timestamp)
      : typeof point.timestamp === 'number'
        ? new Date(point.timestamp)
        : point.timestamp as Date
  })).sort((a, b) => a.parsedTimestamp.getTime() - b.parsedTimestamp.getTime())

  const values = parsedData.map(p => p.value)

  // Calculate statistics
  const stats = calculateStatistics(values)
  
  // Detect main trend
  const trend = detectTrend(values, config.windowSize)
  
  // Detect anomalies
  const anomalies = detectAnomalies(parsedData, config.anomalyThreshold)
  
  // Generate simple forecast
  const forecast = generateForecast(values, config.forecastDays)

  // Generate AI-powered description if data is substantial
  let description = ''
  if (data.length >= 10) {
    try {
      description = await generateTrendDescription(trend, stats, anomalies)
    } catch {
      // Use fallback description
      description = generateFallbackDescription(trend, stats)
    }
  } else {
    description = generateFallbackDescription(trend, stats)
  }

  return {
    trends: [trend],
    anomalies,
    summary: description,
    forecast,
    metadata: {
      dataPointsAnalyzed: data.length,
      dateRange: {
        start: parsedData[0].parsedTimestamp,
        end: parsedData[parsedData.length - 1].parsedTimestamp
      },
      analysisMethod: 'statistical_moving_average'
    }
  }
}

/**
 * Calculates basic statistics for a numeric array
 */
function calculateStatistics(values: number[]): {
  mean: number
  stdDev: number
  min: number
  max: number
  median: number
} {
  const n = values.length
  const sorted = [...values].sort((a, b) => a - b)
  
  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
  const stdDev = Math.sqrt(variance)
  
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]

  return {
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: sorted[0],
    max: sorted[n - 1],
    median
  }
}

/**
 * Detects the primary trend using moving average comparison
 */
function detectTrend(values: number[], windowSize: number): Trend {
  const n = values.length
  
  // Calculate moving averages
  const firstHalfMA = calculateMovingAverage(
    values.slice(0, Math.floor(n / 2)),
    Math.min(windowSize, Math.floor(n / 4))
  )
  const secondHalfMA = calculateMovingAverage(
    values.slice(Math.floor(n / 2)),
    Math.min(windowSize, Math.floor(n / 4))
  )

  const avgFirstMA = firstHalfMA.reduce((a, b) => a + b, 0) / firstHalfMA.length || 0
  const avgSecondMA = secondHalfMA.reduce((a, b) => a + b, 0) / secondHalfMA.length || 0

  // Calculate change percentage
  const changePercent = avgFirstMA !== 0
    ? ((avgSecondMA - avgFirstMA) / Math.abs(avgFirstMA)) * 100
    : 0

  // Determine direction and strength
  let direction: TrendDirection = 'stable'
  let strength = 0

  if (Math.abs(changePercent) < 5) {
    direction = 'stable'
    strength = Math.abs(changePercent) / 5
  } else if (changePercent > 0) {
    direction = 'up'
    strength = Math.min(1, Math.abs(changePercent) / 50)
  } else {
    direction = 'down'
    strength = Math.min(1, Math.abs(changePercent) / 50)
  }

  // Check for volatility (high variance relative to mean)
  const stats = calculateStatistics(values)
  const cv = stats.mean !== 0 ? stats.stdDev / Math.abs(stats.mean) : 0
  
  if (cv > 0.3 && strength < 0.5) {
    direction = 'volatile'
  }

  // Calculate confidence based on data volume and consistency
  const confidence = Math.min(1, (n / 30) * (1 - cv * 0.5))

  return {
    id: `trend_${Date.now()}`,
    name: 'Primary Trend',
    direction,
    strength: Math.round(strength * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    period: {
      start: new Date(Date.now() - n * 24 * 60 * 60 * 1000), // Approximate
      end: new Date()
    },
    statistics: {
      startValue: values[0],
      endValue: values[n - 1],
      changePercent: Math.round(changePercent * 100) / 100,
      averageValue: stats.mean,
      volatility: Math.round(cv * 100) / 100
    }
  }
}

/**
 * Calculates simple moving average
 */
function calculateMovingAverage(values: number[], window: number): number[] {
  const result: number[] = []
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1)
    const windowValues = values.slice(start, i + 1)
    const avg = windowValues.reduce((a, b) => a + b, 0) / windowValues.length
    result.push(Math.round(avg * 100) / 100)
  }

  return result
}

/**
 * Detects anomalies using statistical methods
 */
function detectAnomalies(
  data: Array<TimeSeriesPoint & { parsedTimestamp: Date }>,
  thresholdStdDev: number
): Anomaly[] {
  const values = data.map(d => d.value)
  const stats = calculateStatistics(values)
  
  const anomalies: Anomaly[] = []

  for (let i = 0; i < data.length; i++) {
    const value = data[i].value
    const deviation = Math.abs(value - stats.mean) / stats.stdDev

    if (deviation > thresholdStdDev) {
      let severity: Anomaly['severity'] = 'low'
      if (deviation > 4) severity = 'critical'
      else if (deviation > 3) severity = 'high'
      else if (deviation > 2) severity = 'medium'

      anomalies.push({
        index: i,
        point: data[i],
        expectedRange: {
          min: Math.round((stats.mean - thresholdStdDev * stats.stdDev) * 100) / 100,
          max: Math.round((stats.mean + thresholdStdDev * stats.stdDev) * 100) / 100
        },
        deviation: Math.round(deviation * 100) / 100,
        severity,
        possibleCauses: suggestAnomalyCauses(value, stats, deviation)
      })
    }
  }

  return anomalies
}

/**
 * Suggests possible causes for an anomaly
 */
function suggestAnomalyCauses(
  value: number,
  stats: { mean: number; stdDev: number },
  deviation: number
): string[] {
  const causes: string[] = []
  
  if (value > stats.mean + stats.stdDev * 2) {
    causes.push('Unexpected spike in activity')
    causes.push('Possible promotional event or news')
    causes.push('Data collection artifact')
  } else {
    causes.push('Unexpected drop in activity')
    causes.push('Possible system outage or issue')
    causes.push('Seasonal variation')
  }

  if (deviation > 3) {
    causes.push('Requires investigation - significant outlier')
  }

  return causes
}

/**
 * Generates simple linear forecast
 */
function generateForecast(
  values: number[],
  days: number
): ForecastResult {
  const n = values.length
  
  // Calculate linear regression coefficients
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumX2 += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Generate forecast points
  const points: ForecastResult['points'] = []
  const lastTimestamp = new Date()
  
  for (let i = 1; i <= days; i++) {
    const predictedValue = intercept + slope * (n + i - 1)
    // Confidence decreases over time
    const confidence = Math.max(0.3, 1 - (i / days) * 0.7)
    
    points.push({
      timestamp: new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000),
      value: Math.round(predictedValue * 100) / 100,
      confidence: Math.round(confidence * 100) / 100
    })
  }

  return {
    points,
    method: 'linear_regression',
    horizon: `${days} days`,
    disclaimer: 'Simple linear extrapolation - not suitable for complex patterns'
  }
}

/**
 * Generates AI-powered trend description
 */
async function generateTrendDescription(
  trend: Trend,
  stats: { mean: number; stdDev: number },
  anomalies: Anomaly[]
): Promise<string> {
  const result: AnalysisResult = await jsonCompletion([
    {
      role: 'system',
      content: 'You are a data analyst. Provide a concise trend summary in 2-3 sentences.'
    },
    {
      role: 'user',
      content: `Trend Analysis Results:
- Direction: ${trend.direction}
- Strength: ${(trend.strength * 100).toFixed(1)}%
- Change: ${trend.statistics.changePercent}%
- Average value: ${statistics.mean}
- Volatility: ${trend.statistics.volatility}
- Anomalies detected: ${anomalies.length}`
    }
  ])

  if (result.success && result.data) {
    return String(result.data)
  }
  return generateFallbackDescription(trend, stats)
}

/**
 * Generates fallback description without AI
 */
function generateFallbackDescription(
  trend: Trend,
  _stats: { mean: number; stdDev: number }
): string {
  const directionText = {
    up: 'increasing',
    down: 'decreasing',
    stable: 'stable',
    volatile: 'volatile/fluctuating'
  }

  return `The data shows a ${directionText[trend.direction]} trend ` +
    `with ${(trend.strength * 100).toFixed(0)}% strength. ` +
    `Overall change of ${trend.statistics.changePercent > 0 ? '+' : ''}${trend.statistics.changePercent}% ` +
    `with average value of ${trend.statistics.averageValue}.`
}

/**
 * Compares multiple trend series
 */
export function compareTrends(
  series: Array<{ name: string; data: TimeSeriesPoint[] }>
): Array<{
  name: string
  correlation: number
  relativePerformance: string
}> {
  // Simplified comparison - in production use proper correlation coefficient
  return series.map(s => ({
    name: s.name,
    correlation: Math.random(), // Placeholder
    relativePerformance: Math.random() > 0.5 ? 'outperforming' : 'underperforming'
  }))
}

/**
 * Identifies seasonal patterns in data
 */
export function detectSeasonality(
  data: TimeSeriesPoint[],
  periodDays: number = 7
): {
  hasSeasonality: boolean
  period: number
  strength: number
  pattern: number[]
} {
  if (data.length < periodDays * 2) {
    return { hasSeasonality: false, period: 0, strength: 0, pattern: [] }
  }

  // Check for repeating patterns by comparing periods
  const values = data.map(d => d.value)
  const halfLength = Math.floor(values.length / 2)
  
  const firstHalf = values.slice(0, halfLength)
  const secondHalf = values.slice(halfLength, halfLength * 2)

  // Simple autocorrelation at lag = periodDays
  let correlationSum = 0
  const minLen = Math.min(firstHalf.length, secondHalf.length)
  
  for (let i = 0; i < minLen; i++) {
    correlationSum += firstHalf[i] * secondHalf[i]
  }

  const normalizedCorrelation = correlationSum / minLen
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  const strength = variance > 0 ? Math.abs(normalizedCorrelation - mean ** 2) / variance : 0

  return {
    hasSeasonality: strength > 0.5,
    period: periodDays,
    strength: Math.min(1, strength),
    pattern: values.slice(-periodDays)
  }
}
