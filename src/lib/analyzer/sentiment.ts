/**
 * Sentiment Analysis Module
 * 
 * Provides sentiment analysis capabilities for text data.
 * Supports:
 * - Polarity detection (positive/negative/neutral)
 * - Emotion recognition
 * - Aspect-based sentiment
 * - Aggregated sentiment scoring
 * 
 * Uses a hybrid approach:
 * - Rule-based analysis for speed (AFINN-based lexicon)
 * - Optional AI-powered analysis for accuracy (OpenAI)
 * 
 * @module lib/analyzer/sentiment
 */

import { jsonCompletion, AnalysisResult } from '@/lib/openai'

/**
 * Sentiment polarity enum
 */
export type SentimentPolarity = 'positive' | 'negative' | 'neutral'

/**
 * Emotion categories for deeper analysis
 */
export type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'trust' | 'anticipation'

/**
 * Single text sentiment result
 */
export interface SentimentResult {
  text: string
  polarity: SentimentPolarity
  score: number // -1 to 1
  confidence: number // 0 to 1
  emotions: Record<Emotion, number>
  aspects?: Array<{
    aspect: string
    polarity: SentimentPolarity
    score: number
  }>
}

/**
 * Aggregated sentiment for multiple texts
 */
export interface AggregatedSentiment {
  overallPolarity: SentimentPolarity
  averageScore: number
  distribution: {
    positive: number
    negative: number
    neutral: number
  }
  emotionProfile: Record<Emotion, number>
  totalAnalyzed: number
  keyPhrases: Array<{ phrase: string; sentiment: SentimentPolarity; frequency: number }>
}

/**
 * Simplified AFINN-inspired word list for rule-based analysis
 * In production, use a complete lexicon or ML model
 */
const SENTIMENT_LEXICON: Record<string, number> = {
  // Strong positive
  excellent: 4, amazing: 4, wonderful: 4, fantastic: 4, outstanding: 4,
  superb: 4, brilliant: 4, perfect: 4, love: 3, best: 3,
  
  // Moderate positive
  good: 2, great: 2, nice: 2, happy: 2, pleased: 2, satisfied: 2,
  impressive: 2, recommend: 2, helpful: 2, useful: 2, easy: 1,
  
  // Mild positive
  like: 1, enjoy: 1, decent: 1, fine: 1, ok: 1, okay: 1,
  
  // Neutral words omitted (score 0)
  
  // Mild negative
  poor: -1, bad: -1, issue: -1, problem: -1, difficult: -1, hard: -1,
  
  // Moderate negative
  terrible: -3, horrible: -3, awful: -3, hate: -3, worst: -3,
  disappointed: -2, frustrating: -2, annoying: -2, waste: -2,
  
  // Strong negative
  disaster: -4, dreadful: -4, unacceptable: -4, fail: -4, broken: -4,
  
  // Intensifiers
  very: 1.5, really: 1.5, extremely: 2, absolutely: 2, completely: 1.5,
  not: -1, never: -1, no: -1, neither: -1, hardly: -1,
  
  // Business context
  value: 2, innovative: 2, reliable: 2, quality: 1, professional: 1,
  expensive: -1, overpriced: -2, cheap: -1, buggy: -2, slow: -1
}

/**
 * Emotion keyword mappings
 */
const EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  joy: ['happy', 'excited', 'glad', 'pleased', 'delighted', 'love', 'enjoy', 'fantastic'],
  sadness: ['sad', 'disappointed', 'unhappy', 'sorry', 'regret', 'depressed', 'frustrated'],
  anger: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'outraged', 'hate'],
  fear: ['worried', 'anxious', 'afraid', 'scared', 'concerned', 'nervous', 'uncertain'],
  surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'unexpected', 'wow'],
  disgust: ['disgusting', 'gross', 'revolting', 'awful', 'terrible', 'horrible'],
  trust: ['trust', 'reliable', 'confident', 'believe', 'dependable', 'consistent'],
  anticipation: ['looking forward', 'excited about', 'expect', 'anticipate', 'hopeful']
}

/**
 * Analyzes sentiment of a single text using rule-based approach
 * Fast and cost-effective for large volumes
 */
export function analyzeSentiment(text: string): SentimentResult {
  const normalizedText = text.toLowerCase()
  const words = normalizedText.match(/\b[\w']+\b/g) || []
  
  let totalScore = 0
  let matchedWords = 0
  const emotionScores: Record<Emotion, number> = {
    joy: 0, sadness: 0, anger: 0, fear: 0,
    surprise: 0, disgust: 0, trust: 0, anticipation: 0
  }
  
  let intensifier = 1
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    
    // Check for negation/intensifier
    if (['very', 'really', 'extremely'].includes(word)) {
      intensifier = SENTIMENT_LEXICON[word] || 1.5
      continue
    }
    
    if (['not', 'never', 'no', 'neither', 'hardly'].includes(word)) {
      intensifier = -1
      continue
    }
    
    // Look up word in lexicon
    if (SENTIMENT_LEXICON[word] !== undefined) {
      totalScore += SENTIMENT_LEXICON[word] * intensifier
      matchedWords++
      intensifier = 1 // Reset after use
    }
    
    // Score emotions
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      if (keywords.some(k => word.includes(k) || k.includes(word))) {
        emotionScores[emotion as Emotion] += 1
      }
    }
  }
  
  // Normalize score to -1 to 1 range
  const rawScore = matchedWords > 0 ? totalScore / Math.sqrt(matchedWords) : 0
  const normalizedScore = Math.max(-1, Math.min(1, rawScore / 4))
  
  // Determine polarity
  let polarity: SentimentPolarity = 'neutral'
  if (normalizedScore > 0.1) polarity = 'positive'
  else if (normalizedScore < -0.1) polarity = 'negative'
  
  // Calculate confidence based on how many words were matched
  const confidence = Math.min(1, matchedWords / 10 + 0.3)
  
  // Normalize emotion scores
  const totalEmotions = Object.values(emotionScores).reduce((a, b) => a + b, 0) || 1
  const normalizedEmotions = {} as Record<Emotion, number>
  for (const [emotion, score] of Object.entries(emotionScores)) {
    normalizedEmotions[emotion as Emotion] = score / totalEmotions
  }

  return {
    text,
    polarity,
    score: Math.round(normalizedScore * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    emotions: normalizedEmotions
  }
}

/**
 * Analyzes sentiment using AI (OpenAI) for higher accuracy
 * More expensive but provides aspect-based analysis
 */
export async function analyzeSentimentAI(text: string): Promise<SentimentResult> {
  const result: AnalysisResult = await jsonCompletion([
    {
      role: 'system',
      content: `You are a sentiment analysis expert. Analyze the given text and return JSON with:
{
  "polarity": "positive|negative|neutral",
  "score": -1 to 1,
  "confidence": 0 to 1,
  "emotions": {"joy": 0-1, "sadness": 0-1, ...},
  "aspects": [{"aspect": "...", "polarity": "...", "score": -1 to 1}]
}`
    },
    { role: 'user', content: text }
  ])

  if (!result.success || !result.data) {
    // Fallback to rule-based
    return analyzeSentiment(text)
  }

  return {
    text,
    ...(result.data as Omit<SentimentResult, 'text'>)
  }
}

/**
 * Aggregates sentiment across multiple texts
 */
export function aggregateSentiment(results: SentimentResult[]): AggregatedSentiment {
  if (results.length === 0) {
    return {
      overallPolarity: 'neutral',
      averageScore: 0,
      distribution: { positive: 0, negative: 0, neutral: 0 },
      emotionProfile: {
        joy: 0, sadness: 0, anger: 0, fear: 0,
        surprise: 0, disgust: 0, trust: 0, anticipation: 0
      },
      totalAnalyzed: 0,
      keyPhrases: []
    }
  }

  // Calculate averages
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length

  let overallPolarity: SentimentPolarity = 'neutral'
  if (avgScore > 0.1) overallPolarity = 'positive'
  else if (avgScore < -0.1) overallPolarity = 'negative'

  // Count distributions
  const distribution = {
    positive: results.filter(r => r.polarity === 'positive').length,
    negative: results.filter(r => r.polarity === 'negative').length,
    neutral: results.filter(r => r.polarity === 'neutral').length
  }

  // Aggregate emotions
  const emotionProfile = {} as Record<Emotion, number>
  const emotions: Emotion[] = [
    'joy', 'sadness', 'anger', 'fear',
    'surprise', 'disgust', 'trust', 'anticipation'
  ]

  for (const emotion of emotions) {
    emotionProfile[emotion] = results.reduce(
      (sum, r) => sum + (r.emotions[emotion] || 0), 0
    ) / results.length
  }

  // Extract key phrases (simplified - would need NLP for real extraction)
  const phraseCounts: Record<string, { sentiment: SentimentPolarity; count: number }> = {}
  results.forEach(result => {
    // Extract significant words as phrases
    const words = result.text.toLowerCase().split(/\s+/).filter(w => w.length > 4)
    words.slice(0, 3).forEach(word => {
      if (!phraseCounts[word]) {
        phraseCounts[word] = { sentiment: result.polarity, count: 0 }
      }
      phraseCounts[word].count++
    })
  })

  const keyPhrases = Object.entries(phraseCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([phrase, data]) => ({
      phrase,
      sentiment: data.sentiment,
      frequency: data.count
    }))

  return {
    overallPolarity,
    averageScore: Math.round(avgScore * 100) / 100,
    distribution,
    emotionProfile,
    totalAnalyzed: results.length,
    keyPhrases
  }
}

/**
 * Classifies text into sentiment categories with thresholds
 */
export function classifyByThreshold(
  score: number,
  positiveThreshold: number = 0.2,
  negativeThreshold: number = -0.2
): { category: string; label: string } {
  if (score >= positiveThreshold) {
    return { category: 'positive', label: 'Positive' }
  } else if (score <= negativeThreshold) {
    return { category: 'negative', label: 'Negative' }
  } else {
    return { category: 'neutral', label: 'Neutral' }
  }
}

/**
 * Generates a human-readable sentiment summary
 */
export function generateSentimentSummary(aggregated: AggregatedSentiment): string {
  const pct = (n: number) => `${Math.round(n / aggregated.totalAnalyzed * 100)}%`
  
  let summary = `Analysis of ${aggregated.totalAnalyzed} items shows `
  summary += `overall ${aggregated.overallPolarity} sentiment `
  summary += `(average score: ${aggregated.averageScore}). `
  summary += `Distribution: ${pct(aggregated.distribution.positive)} positive, `
  summary += `${pct(aggregated.distribution.negative)} negative, `
  summary += `${pct(aggregated.distribution.neutral)} neutral.`

  // Add dominant emotion
  const dominantEmotion = Object.entries(aggregated.emotionProfile)
    .sort((a, b) => b[1] - a[1])[0]
  
  if (dominantEmotion && dominantEmotion[1] > 0.1) {
    summary += ` Dominant emotion: ${dominantEmotion[0]}.`
  }

  return summary
}
