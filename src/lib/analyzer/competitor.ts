/**
 * Competitor Analysis Module
 * 
 * Provides comprehensive competitor analysis capabilities:
 * - Feature comparison matrices
 * - Pricing analysis
 * - Market positioning mapping
 * - SWOT analysis generation
 * - Competitive advantage identification
 * 
 * @module lib/analyzer/competitor
 */

import { jsonCompletion, AnalysisResult } from '@/lib/openai'

/**
 * Competitor data structure for analysis
 */
export interface CompetitorData {
  id: string
  name: string
  website?: string
  description?: string
  
  // Business metrics
  foundedYear?: number
  employeeCount?: string
  revenueEstimate?: string
  fundingInfo?: string
  
  // Digital presence
  monthlyVisits?: number
  alexaRank?: number
  socialFollowers?: Record<string, number>
  
  // Product/service info
  features?: string[]
  pricing?: Array<{
    plan: string
    price: number | null
    period: string
    features: string[]
  }>
  
  // Known attributes
  strengths?: string[]
  weaknesses?: string[]
  marketPositioning?: string
  uniqueValueProposition?: string
}

/**
 * Feature comparison result
 */
export interface FeatureComparison {
  feature: string
  competitors: Array<{
    name: string
    hasFeature: boolean
    notes?: string
  }>
  availability: number // Percentage of competitors with this feature
  importance: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Pricing analysis result
 */
export interface PricingAnalysis {
  competitors: Array<{
    name: string
    plans: CompetitorData['pricing']
    averagePrice: number | null
    priceRange: { min: number; max: number } | null
    positioning: 'budget' | 'mid-market' | 'premium' | 'enterprise'
  }>
  marketAverage: number
  priceVariance: number
  insights: string[]
}

/**
 * Market positioning on a 2D matrix
 */
export interface MarketPosition {
  competitor: string
  x: number // Price axis (low to high)
  y: number // Quality/Features axis (low to high)
  quadrant: 'budget' | 'value' | 'premium' | 'luxury'
  cluster: string
}

/**
 * SWOT analysis result
 */
export interface SWOTAnalysis {
  strengths: Array<{ item: string; impact: 'high' | 'medium' | 'low' }>
  weaknesses: Array<{ item: string; impact: 'high' | 'medium' | 'low' }>
  opportunities: Array<{ item: string; impact: 'high' | 'medium' | 'low' }>
  threats: Array<{ item: string; impact: 'high' | 'medium' | 'low' }>
  summary: string
}

/**
 * Complete competitive analysis result
 */
export interface CompetitiveAnalysisResult {
  featureComparison: FeatureComparison[]
  pricingAnalysis: PricingAnalysis
  marketPositions: MarketPosition[]
  swotAnalysis: SWOTAnalysis
  recommendations: string[]
  metadata: {
    competitorsAnalyzed: number
    analysisDate: Date
    confidence: number
  }
}

/**
 * Performs comprehensive competitive analysis
 * 
 * @param competitors - Array of competitor data
 * @param ourCompany - Optional reference company data (for relative analysis)
 * @returns Complete competitive analysis results
 * 
 * @example
 * const analysis = await analyzeCompetitors([
 *   { name: 'Competitor A', features: ['feature1', 'feature2'], pricing: [...] },
 *   { name: 'Competitor B', features: ['feature1', 'feature3'], pricing: [...] }
 * ])
 */
export async function analyzeCompetitors(
  competitors: CompetitorData[],
  ourCompany?: Partial<CompetitorData>
): Promise<CompetitiveAnalysisResult> {
  if (competitors.length === 0) {
    throw new Error('At least one competitor is required for analysis')
  }

  // Run all analyses in parallel
  const [featureComparison, pricingAnalysis, marketPositions] = await Promise.all([
    compareFeatures(competitors),
    analyzePricing(competitors),
    calculateMarketPositions(competitors)
  ])

  // Generate SWOT analysis (uses AI)
  const swotAnalysis = await generateSWOT(competitors, ourCompany)

  // Generate strategic recommendations
  const recommendations = generateRecommendations(
    featureComparison,
    pricingAnalysis,
    marketPositions,
    swotAnalysis
  )

  return {
    featureComparison,
    pricingAnalysis,
    marketPositions,
    swotAnalysis,
    recommendations,
    metadata: {
      competitorsAnalyzed: competitors.length,
      analysisDate: new Date(),
      confidence: Math.min(0.95, 0.7 + competitors.length * 0.05)
    }
  }
}

/**
 * Determines feature importance based on availability and heuristics
 */
function determineFeatureImportance(
  _feature: string, 
  availability: number
): 'critical' | 'high' | 'medium' | 'low' {
  // Features that most competitors have are likely critical (table stakes)
  if (availability >= 0.8) return 'critical'
  if (availability >= 0.6) return 'high'
  if (availability >= 0.3) return 'medium'
  return 'low'
}

/**
 * Compares features across competitors
 */
async function compareFeatures(competitors: CompetitorData[]): Promise<FeatureComparison[]> {
  // Collect all unique features
  const allFeatures = new Set<string>()
  competitors.forEach(c => {
    c.features?.forEach(f => allFeatures.add(f))
    c.strengths?.forEach(s => allFeatures.add(s)) // Include strengths as potential features
  })

  // Build comparison matrix
  const comparisons: FeatureComparison[] = []
  
  for (const feature of allFeatures) {
    const competitorStatus = competitors.map(comp => ({
      name: comp.name,
      hasFeature: comp.features?.some(f => 
        f.toLowerCase().includes(feature.toLowerCase()) || 
        feature.toLowerCase().includes(f.toLowerCase())
      ) || comp.strengths?.some(s =>
        s.toLowerCase().includes(feature.toLowerCase())
      ) || false
    }))

    const availability = competitorStatus.filter(c => c.hasFeature).length / competitors.length

    comparisons.push({
      feature,
      competitors: competitorStatus,
      availability: Math.round(availability * 100),
      importance: determineFeatureImportance(feature, availability)
    })
  }

  // Sort by availability (most common first)
  return comparisons.sort((a, b) => b.availability - a.availability)
}

/**
 * Analyzes pricing across competitors
 */
async function analyzePricing(competitors: CompetitorData[]): Promise<PricingAnalysis> {
  const pricingData = competitors.map(comp => {
    const prices = comp.pricing
      ?.map(p => p.price)
      .filter((p): p is number => p !== null) || []

    const avgPrice = prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null

    const priceRange = prices.length > 0
      ? { min: Math.min(...prices), max: Math.max(...prices) }
      : null

    let positioning: PricingAnalysis['competitors'][0]['positioning'] = 'mid-market'
    
    if (avgPrice !== null) {
      if (avgPrice < 50) positioning = 'budget'
      else if (avgPrice < 200) positioning = 'mid-market'
      else if (avgPrice < 500) positioning = 'premium'
      else positioning = 'enterprise'
    }

    return {
      name: comp.name,
      plans: comp.pricing || [],
      averagePrice: avgPrice ? Math.round(avgPrice * 100) / 100 : null,
      priceRange,
      positioning
    }
  })

  // Calculate market statistics
  const validPrices = pricingData
    .map(p => p.averagePrice)
    .filter((p): p is number => p !== null)

  const marketAverage = validPrices.length > 0
    ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
    : 0

  const variance = validPrices.length > 0
    ? validPrices.reduce((sum, p) => sum + (p - marketAverage) ** 2, 0) / validPrices.length
    : 0

  // Generate insights
  const insights = generatePricingInsights(pricingData, marketAverage)

  return {
    competitors: pricingData,
    marketAverage: Math.round(marketAverage * 100) / 100,
    priceVariance: Math.round(Math.sqrt(variance)),
    insights
  }
}

/**
 * Generates pricing insights
 */
function generatePricingInsights(
  data: PricingAnalysis['competitors'],
  marketAverage: number
): string[] {
  const insights: string[] = []

  // Identify outliers
  const budgetPlayers = data.filter(d => d.positioning === 'budget')
  const premiumPlayers = data.filter(d => d.positioning === 'premium' || d.positioning === 'enterprise')

  if (budgetPlayers.length > 0 && premiumPlayers.length > 0) {
    insights.push('Market shows clear price segmentation between budget and premium offerings')
  }

  // Check price clustering
  const avgPrices = data.map(d => d.averagePrice).filter((p): p is number => p !== null)
  if (avgPrices.length > 2) {
    const spread = Math.max(...avgPrices) - Math.min(...avgPrices)
    if (spread > marketAverage) {
      insights.push('Significant price variation suggests differentiated value propositions')
    }
  }

  // Check for gaps
  if (data.filter(d => d.positioning === 'mid-market').length === 0) {
    insights.push('Potential gap in mid-market pricing segment')
  }

  return insights
}

/**
 * Calculates market positions on a 2D plane
 */
async function calculateMarketPositions(
  competitors: CompetitorData[]
): Promise<MarketPosition[]> {
  // Normalize metrics for positioning
  const positions: MarketPosition[] = competitors.map(comp => {
    // X-axis: Price position (normalized 0-10)
    let xPosition = 5 // Default mid-market
    
    if (comp.pricing && comp.pricing.length > 0) {
      const prices = comp.pricing.map(p => p.price).filter((p): p is number => p !== null)
      if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
        // Normalize: assume $0-500 range maps to 0-10
        xPosition = Math.min(10, Math.max(0, (avgPrice / 50) * 1))
      }
    }

    // Y-axis: Feature completeness (normalized 0-10)
    const featureCount = comp.features?.length || 0
    const strengthCount = comp.strengths?.length || 0
    const yPosition = Math.min(10, ((featureCount + strengthCount) / 5) * 2)

    // Determine quadrant
    let quadrant: MarketPosition['quadrant']
    if (xPosition < 5 && yPosition < 5) quadrant = 'budget'
    else if (xPosition < 5 && yPosition >= 5) quadrant = 'value'
    else if (xPosition >= 5 && yPosition < 5) quadrant = 'premium' // High price, low features (overpriced?)
    else quadrant = 'luxury'

    // Simple clustering based on proximity
    const cluster = `${quadrant}_${yPosition > 7 ? 'full_featured' : 'basic'}`

    return {
      competitor: comp.name,
      x: Math.round(xPosition * 100) / 100,
      y: Math.round(yPosition * 100) / 100,
      quadrant,
      cluster
    }
  })

  return positions
}

/**
 * Generates SWOT analysis using AI
 */
async function generateSWOT(
  competitors: CompetitorData[],
  ourCompany?: Partial<CompetitorData>
): Promise<SWOTAnalysis> {
  try {
    const prompt = buildSWOTPrompt(competitors, ourCompany)
    
    const result: AnalysisResult = await jsonCompletion([
      {
        role: 'system',
        content: `You are a strategic business analyst. Generate a SWOT analysis based on competitor data.
Return JSON format:
{
  "strengths": [{"item": "...", "impact": "high|medium|low"}],
  "weaknesses": [{"item": "...", "impact": "high|medium|low"}],
  "opportunities": [{"item": "...", "impact": "high|medium|low"}],
  "threats": [{"item": "...", "impact": "high|medium|low"}],
  "summary": "Brief executive summary"
}`
      },
      { role: 'user', content: prompt }
    ])

    if (result.success && result.data) {
      return result.data as SWOTAnalysis
    }
  } catch (error) {
    console.error('AI SWOT generation failed:', error)
  }

  // Fallback to rule-based SWOT
  return generateFallbackSWOT(competitors)
}

/**
 * Builds the prompt for SWOT analysis
 */
function buildSWOTPrompt(
  competitors: CompetitorData[],
  ourCompany?: Partial<CompetitorData>
): string {
  let prompt = `Competitive Landscape:\n\n`
  
  competitors.forEach((c, i) => {
    prompt += `Competitor ${i + 1}: ${c.name}\n`
    if (c.description) prompt += `- Description: ${c.description}\n`
    if (c.features?.length) prompt += `- Features: ${c.features.join(', ')}\n`
    if (c.strengths?.length) prompt += `- Strengths: ${c.strengths.join(', ')}\n`
    if (c.weaknesses?.length) prompt += `- Weaknesses: ${c.weaknesses.join(', ')}\n`
    if (c.marketPositioning) prompt += `- Positioning: ${c.marketPositioning}\n`
    if (c.uniqueValueProposition) prompt += `- UVP: ${c.uniqueValueProposition}\n`
    prompt += '\n'
  })

  if (ourCompany) {
    prompt += `\nOur Company Context:\n`
    if (ourCompany.name) prompt += `- Name: ${ourCompany.name}\n`
    if (ourCompany.features?.length) prompt += `- Our Features: ${ourCompany.features.join(', ')}\n`
    if (ourCompany.strengths?.length) prompt += `- Our Strengths: ${ourCompany.strengths.join(', ')}\n`
  }

  return prompt
}

/**
 * Generates fallback SWOT without AI
 */
function generateFallbackSWOT(competitors: CompetitorData[]): SWOTAnalysis {
  // Extract common patterns from competitor data
  const allStrengths = competitors.flatMap(c => c.strengths || [])
  const allWeaknesses = competitors.flatMap(c => c.weaknesses || [])
  const allFeatures = new Set(competitors.flatMap(c => c.features || []))

  return {
    strengths: [
      ...allStrengths.slice(0, 3).map(s => ({ item: s, impact: 'high' as const }))
    ],
    weaknesses: [
      ...allWeaknesses.slice(0, 3).map(w => ({ item: w, impact: 'medium' as const }))
    ],
    opportunities: [
      { item: `Address gaps in competitor offerings (${allFeatures.size} total features tracked)`, impact: 'high' as const },
      { item: 'Leverage underserved market segments', impact: 'medium' as const }
    ],
    threats: [
      { item: `Competition from ${competitors.length} identified competitors`, impact: 'high' as const },
      { item: 'Potential price compression in crowded segments', impact: 'medium' as const }
    ],
    summary: `Analysis of ${competitors.length} competitors reveals opportunities for differentiation.`
  }
}

/**
 * Generates strategic recommendations based on analysis
 */
function generateRecommendations(
  featureComparison: FeatureComparison[],
  pricingAnalysis: PricingAnalysis,
  marketPositions: MarketPosition[],
  swot: SWOTAnalysis
): string[] {
  const recommendations: string[] = []

  // Feature-based recommendations
  const missingCriticalFeatures = featureComparison
    .filter(f => f.importance === 'critical' && f.availability < 80)
  
  if (missingCriticalFeatures.length > 0) {
    recommendations.push(
      `Prioritize development of critical features missing from market: ${missingCriticalFeatures.map(f => f.feature).join(', ')}`
    )
  }

  // Differentiation opportunity
  const rareFeatures = featureComparison
    .filter(f => f.importance === 'high' && f.availability < 30)
  
  if (rareFeatures.length > 0) {
    recommendations.push(
      `Consider differentiating with underutilized features: ${rareFeatures.map(f => f.feature).join(', ')}`
    )
  }

  // Pricing recommendations
  const budgetPlayers = pricingAnalysis.competitors.filter(c => c.positioning === 'budget')
  const premiumPlayers = pricingAnalysis.competitors.filter(c => c.positioning === 'premium')

  if (budgetPlayers.length === 0 && premiumPlayers.length > 0) {
    recommendations.push('Consider introducing budget-friendly tier to capture price-sensitive segment')
  } else if (premiumPlayers.length === 0 && budgetPlayers.length > 0) {
    recommendations.push('Opportunity for premium positioning with enhanced features and support')
  }

  // Positioning recommendations
  const valueQuadrant = marketPositions.filter(m => m.quadrant === 'value')
  if (valueQuadrant.length <= 1) {
    recommendations.push('Value quadrant (quality at reasonable price) appears underserved')
  }

  // SWOT-based recommendations
  const highImpactThreats = swot.threats.filter(t => t.impact === 'high')
  if (highImpactThreats.length > 0) {
    recommendations.push(`Develop mitigation strategies for key threats: ${highImpactThreats.map(t => t.item).join('; ')}`)
  }

  return recommendations
}

/**
 * Calculates similarity score between two competitors
 * Useful for identifying direct vs indirect competition
 */
export function calculateCompetitorSimilarity(
  a: CompetitorData,
  b: CompetitorData
): number {
  let similarityScore = 0
  let factorsChecked = 0

  // Compare features overlap
  if (a.features && b.features && a.features.length > 0 && b.features.length > 0) {
    const commonFeatures = a.features.filter(f => 
      b.features!.some(bf => bf.toLowerCase() === f.toLowerCase())
    )
    const unionSize = new Set([...a.features, ...b.features!]).size
    similarityScore += commonFeatures.length / unionSize
    factorsChecked++
  }

  // Compare pricing range
  if (a.pricing && b.pricing && a.pricing.length > 0 && b.pricing.length > 0) {
    const aPrices = a.pricing.map(p => p.price).filter((p): p is number => p !== null)
    const bPrices = b.pricing.map(p => p.price).filter((p): p is number => p !== null)
    
    if (aPrices.length > 0 && bPrices.length > 0) {
      const aAvg = aPrices.reduce((s, p) => s + p, 0) / aPrices.length
      const bAvg = bPrices.reduce((s, p) => s + p, 0) / bPrices.length
      const maxAvg = Math.max(aAvg, bAvg)
      
      if (maxAvg > 0) {
        similarityScore += 1 - Math.abs(aAvg - bAvg) / maxAvg
        factorsChecked++
      }
    }
  }

  // Compare target market (via positioning text similarity)
  if (a.marketPositioning && b.marketPositioning) {
    const wordsA = a.marketPositioning.toLowerCase().split(/\s+/)
    const wordsB = b.marketPositioning.toLowerCase().split(/\s+/)
    const commonWords = wordsA.filter(w => wordsB.includes(w)).length
    const uniqueWords = new Set([...wordsA, ...wordsB]).size
    
    if (uniqueWords > 0) {
      similarityScore += commonWords / uniqueWords
      factorsChecked++
    }
  }

  return factorsChecked > 0 ? similarityScore / factorsChecked : 0
}
