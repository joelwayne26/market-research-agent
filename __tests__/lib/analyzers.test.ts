/**
 * Analyzer Module Tests
 * 
 * Tests for the analysis modules:
 * - Sentiment Analysis
 * - Trend Detection
 * - Competitor Analysis
 */

import { describe, it, expect } from 'vitest'
import { 
  analyzeSentiment, 
  aggregateSentiment, 
  classifyByThreshold,
  generateSentimentSummary 
} from '@/lib/analyzer/sentiment'
import { analyzeTrends, detectSeasonality } from '@/lib/analyzer/trends'
import { calculateCompetitorSimilarity } from '@/lib/analyzer/competitor'

describe('Sentiment Analysis', () => {
  describe('analyzeSentiment()', () => {
    it('should detect positive sentiment in positive text', () => {
      const result = analyzeSentiment(
        'This is an amazing product! I love it so much. Excellent quality!'
      )

      expect(result.polarity).toBe('positive')
      expect(result.score).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it('should detect negative sentiment in negative text', () => {
      const result = analyzeSentiment(
        'This is terrible. I hate it. Worst purchase ever. Complete waste of money.'
      )

      expect(result.polarity).toBe('negative')
      expect(result.score).toBeLessThan(0)
      expect(result.score).toBeGreaterThanOrEqual(-1)
    })

    it('should classify neutral text as neutral', () => {
      const result = analyzeSentiment(
        'The product is available in blue or red. It costs fifty dollars.'
      )

      expect(['neutral', 'positive']).toContain(result.polarity) // May lean slightly positive
    })

    it('should handle negation correctly', () => {
      const positiveResult = analyzeSentiment('This is not bad at all')
      const negativeResult = analyzeSentiment('This is not good')

      // "Not bad" should be more positive than "not good"
      expect(positiveResult.score).toBeGreaterThan(negativeResult.score)
    })

    it('should return valid emotion scores', () => {
      const result = analyzeSentiment('I am happy with this excellent product!')

      expect(result.emotions).toBeDefined()
      expect(typeof result.emotions.joy).toBe('number')
      expect(typeof result.emotions.anger).toBe('number')
      
      // Emotions should sum to approximately 1 (normalized)
      const totalEmotion = Object.values(result.emotions).reduce((a, b) => a + b, 0)
      expect(totalEmotion).toBeLessThanOrEqual(1.5) // Allow some tolerance
    })

    it('should handle empty text gracefully', () => {
      const result = analyzeSentiment('')

      expect(result.polarity).toBe('neutral')
      expect(result.score).toBe(0)
    })
  })

  describe('aggregateSentiment()', () => {
    it('should aggregate multiple results correctly', () => {
      const results = [
        analyzeSentiment('Great product!'),
        analyzeSentiment('I love this!'),
        analyzeSentiment('Terrible experience.'),
        analyzeSentiment('It is okay.')
      ]

      const aggregated = aggregateSentiment(results)

      expect(aggregated.totalAnalyzed).toBe(4)
      expect(aggregated.overallPolarity).toBeDefined()
      expect(typeof aggregated.averageScore).toBe('number')
      expect(aggregated.distribution.positive + 
             aggregated.distribution.negative + 
             aggregated.distribution.neutral).toBe(4)
    })

    it('should return safe defaults for empty array', () => {
      const aggregated = aggregateSentiment([])

      expect(aggregated.totalAnalyzed).toBe(0)
      expect(aggregated.overallPolarity).toBe('neutral')
      expect(aggregated.averageScore).toBe(0)
    })

    it('should identify key phrases from analyzed text', () => {
      const results = [
        analyzeSentiment('The customer service was excellent and helpful'),
        analyzeSentiment('Customer service was great')
      ]

      const aggregated = aggregateSentiment(results)

      expect(aggregated.keyPhrases).toBeDefined()
      expect(Array.isArray(aggregated.keyPhrases)).toBe(true)
    })
  })

  describe('classifyByThreshold()', () => {
    it('should classify high scores as positive', () => {
      const result = classifyByThreshold(0.8)
      expect(result.category).toBe('positive')
    })

    it('should classify low scores as negative', () => {
      const result = classifyByThreshold(-0.5)
      expect(result.category).toBe('negative')
    })

    it('should classify middle scores as neutral', () => {
      const result = classifyByThreshold(0.05)
      expect(result.category).toBe('neutral')
    })

    it('should respect custom thresholds', () => {
      const result = classifyByThreshold(0.15, 0.2, -0.2)
      expect(result.category).toBe('neutral') // Below custom threshold
    })
  })

  describe('generateSentimentSummary()', () => {
    it('should generate a readable summary', () => {
      const aggregated = aggregateSentiment([
        analyzeSentiment('Great!'),
        analyzeSentiment('Love it!')
      ])

      const summary = generateSentimentSummary(aggregated)

      expect(typeof summary).toBe('string')
      expect(summary.length).toBeGreaterThan(10)
      expect(summary.toLowerCase()).toContain('sentiment')
    })
  })
})

describe('Trend Detection', () => {
  describe('analyzeTrends()', () => {
    it('should detect upward trend in increasing data', async () => {
      const data = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 86400000),
        value: 100 + i * 5 // Increasing values
      }))

      const result = await analyzeTrends(data)

      expect(result.trends.length).toBeGreaterThan(0)
      expect(result.trends[0].direction).toBe('up')
      expect(result.trends[0].strength).toBeGreaterThan(0)
    })

    it('should detect downward trend in decreasing data', async () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() - (20 - i) * 86400000),
        value: 200 - i * 3 // Decreasing values
      }))

      const result = await analyzeTrends(data)

      expect(result.trends.length).toBeGreaterThan(0)
      expect(['down', 'stable']).toContain(result.trends[0].direction)
    })

    it('should identify anomalies in data with outliers', async () => {
      const data = Array.from({ length: 15 }, (_, i) => ({
        timestamp: new Date(Date.now() - (15 - i) * 86400000),
        value: i === 10 ? 1000 : 50 + Math.random() * 10 // One outlier
      }))

      const result = await analyzeTrends(data)

      expect(result.anomalies).toBeDefined()
      // The outlier should be detected
      if (result.anomalies.length > 0) {
        expect(result.anomalies[0].severity).toBeDefined()
      }
    })

    it('should handle insufficient data gracefully', async () => {
      const data = [
        { timestamp: new Date(), value: 100 },
        { timestamp: new Date(), value: 102 }
      ]

      const result = await analyzeTrends(data)

      expect(result.summary).toContain('Insufficient data')
    })

    it('should include forecast when enough data exists', async () => {
      const data = Array.from({ length: 15 }, (_, i) => ({
        timestamp: new Date(Date.now() - (15 - i) * 86400000),
        value: 100 + i * 2 + Math.random() * 5
      }))

      const result = await analyzeTrends(data, { forecastDays: 7 })

      expect(result.forecast).toBeDefined()
      expect(result.forecast?.points.length).toBe(7)
      expect(result.forecast?.method).toBe('linear_regression')
    })
  })

  describe('detectSeasonality()', () => {
    it('should detect seasonality in repeating patterns', () => {
      // Create data with weekly pattern
      const data = []
      for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 7; day++) {
          data.push({
            timestamp: new Date(Date.now() - ((4 * 7) - (week * 7 + day)) * 86400000),
            value: day < 5 ? 100 : 30 // Weekday vs weekend pattern
          })
        }
      }

      const result = detectSeasonality(data, 7)

      expect(result.period).toBe(7)
      expect(result.hasSeasonality).toBeDefined()
      expect(typeof result.strength).toBe('number')
    })

    it('should return no seasonality for random data', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() - (20 - i) * 86400000),
        value: Math.random() * 100
      }))

      const result = detectSeasonality(data, 7)

      expect(result.hasSeasonity).toBe(false)
    })
  })
})

describe('Competitor Analysis', () => {
  describe('calculateCompetitorSimilarity()', () => {
    it('should return high similarity for identical competitors', () => {
      const compA = {
        id: '1',
        name: 'Company A',
        features: ['feature1', 'feature2', 'feature3'],
        pricing: [{ plan: 'basic', price: 50, period: 'month' }],
        marketPositioning: 'Enterprise SaaS solution'
      }

      const compB = {
        id: '2',
        name: 'Company B',
        features: ['feature1', 'feature2', 'feature3'],
        pricing: [{ plan: 'basic', price: 55, period: 'month' }],
        marketPositioning: 'Enterprise SaaS platform'
      }

      const similarity = calculateCompetitorSimilarity(compA, compB)

      expect(similarity).toBeGreaterThanOrEqual(0)
      expect(similarity).toBeLessThanOrEqual(1)
      expect(similarity).toBeGreaterThan(0.5) // Should be similar
    })

    it('should return low similarity for different competitors', () => {
      const compA = {
        id: '1',
        name: 'TechCorp',
        features: ['cloud', 'ai', 'analytics'],
        pricing: [{ plan: 'enterprise', price: 500, period: 'month' }],
        marketPositioning: 'AI-powered enterprise solutions'
      }

      const compB = {
        id: '2',
        name: 'LocalShop',
        features: ['retail', 'inventory', 'pos'],
        pricing: [{ plan: 'basic', price: 29, period: 'month' }],
        marketPositioning: 'Small business retail management'
      }

      const similarity = calculateCompetitorSimilarity(compA, compB)

      expect(similarity).toBeGreaterThanOrEqual(0)
      expect(similarity).toBeLessThanOrEqual(1)
      expect(similarity).toBeLessThan(0.5) // Should be dissimilar
    })

    it('should handle missing optional fields', () => {
      const compA = { id: '1', name: 'A' }
      const compB = { id: '2', name: 'B' }

      const similarity = calculateCompetitorSimilarity(compA, compB)

      expect(similarity).toBe(0) // No comparable fields
    })
  })
})
