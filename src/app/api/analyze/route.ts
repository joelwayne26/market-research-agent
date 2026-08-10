/**
 * AI Analysis API Route
 * 
 * Triggers AI-powered analysis on collected data.
 * Supports multiple analysis types:
 * - Sentiment analysis of text data
 * - Trend detection in time-series data
 * - Competitor comparison and benchmarking
 * - Entity extraction and categorization
 * 
 * @module api/analyze
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

/**
 * Valid analysis types
 */
const ANALYSIS_TYPES = [
  'sentiment',
  'entity_extraction',
  'topic_modeling',
  'trend_detection',
  'competitor_comparison',
  'pricing_extraction',
  'summary'
] as const

/**
 * Schema for analysis request
 */
const analyzeSchema = z.object({
  // Target specification
  projectId: z.string().uuid(),
  
  // Analysis configuration
  analysisTypes: z.array(z.enum(ANALYSIS_TYPES)).min(1).max(10),
  
  // Data source filtering (optional)
  dataSourceIds: z.array(z.string().uuid()).optional(),
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }).optional(),
  
  // AI model configuration
  model: z.enum(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']).optional().default('gpt-4-turbo'),
  temperature: z.number().min(0).max(1).optional().default(0.3),
  
  // Output options
  generateInsights: z.boolean().optional().default(true),
  maxInsightsPerType: z.number().int().min(1).max(20).optional().default(5),
})

/**
 * Interface for analysis job status
 */
interface AnalysisJob {
  id: string
  projectId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  analysisTypes: string[]
  startedAt: string
  completedAt?: string
  resultsCount: number
}

/**
 * POST /api/analyze
 * 
 * Triggers AI analysis on project data.
 * Runs asynchronously and returns a job ID for tracking.
 * 
 * @body projectId - Project to analyze
 * @body analysisTypes - Types of analysis to perform
 * @body dataSourceIds - Optional specific data sources to analyze
 * @body model - AI model to use (default: gpt-4-turbo)
 * @body temperature - Model creativity (0-1)
 * @body generateInsights - Whether to auto-generate insights
 * 
 * @example
 * POST /api/analyze
 * {
 *   "projectId": "uuid-here",
 *   "analysisTypes": ["sentiment", "trend_detection"],
 *   "generateInsights": true,
 *   "model": "gpt-4-turbo"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config = analyzeSchema.parse(body)

    // Verify project exists
    const projectResult = await query(
      'SELECT id, status FROM research_projects WHERE id = $1',
      [config.projectId]
    )

    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if project has data to analyze
    const dataCheck = await query(
      `SELECT COUNT(*) as count FROM raw_data WHERE project_id = $1`,
      [config.projectId]
    )

    const dataCount = parseInt(dataCheck.rows[0].count, 10)
    
    if (dataCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No data available for analysis',
          hint: 'Run research collection first to gather data'
        },
        { status: 400 }
      )
    }

    // Create analysis job record (in production, use a proper job queue)
    const jobId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Log analysis start
    await query(`
      INSERT INTO audit_log (project_id, action, entity_type, actor_type, details)
      VALUES ($1, 'analysis_started', 'analyzed_data', 'ai_agent', $2)
    `, [config.projectId, JSON.stringify({ jobId, ...config })])

    // Start async analysis processing
    executeAnalysis(config, jobId).catch(error => {
      console.error('Analysis execution failed:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Analysis job queued successfully',
      data: {
        jobId,
        projectId: config.projectId,
        analysisTypes: config.analysisTypes,
        estimatedDuration: estimateAnalysisDuration(config.analysisTypes.length, dataCount),
        status: 'queued'
      }
    }, { status: 202 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error triggering analysis:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger analysis' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analyze
 * 
 * Gets analysis results and status for a project.
 * Returns aggregated analysis data with statistics.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId parameter is required' },
        { status: 400 }
      )
    }

    // Get all analyses for the project
    const analysesResult = await query(`
      SELECT 
        analysis_type,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence,
        MIN(created_at) as first_analysis,
        MAX(created_at) as last_analysis
      FROM analyzed_data
      WHERE project_id = $1
      GROUP BY analysis_type
      ORDER BY count DESC
    `, [projectId])

    // Get recent analyses
    const recentAnalyses = await query(`
      SELECT * FROM analyzed_data
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [projectId])

    return NextResponse.json({
      success: true,
      data: {
        summary: analysesResult.rows.map((row: Record<string, unknown>) => ({
          type: row.analysis_type,
          count: parseInt(row.count || '0', 10),
          averageConfidence: parseFloat(row.avg_confidence || '0'),
          firstAnalyzed: row.first_analysis,
          lastAnalyzed: row.last_analysis
        })),
        recentAnalyses: recentAnalyses.rows.map((row: Record<string, unknown>) => ({
          ...row,
          result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
          insights: Array.isArray(row.insights) ? row.insights : []
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching analysis data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analysis data' },
      { status: 500 }
    )
  }
}

/**
 * Executes the analysis pipeline asynchronously
 * Simulates AI analysis - in production would call OpenAI/LangChain
 */
async function executeAnalysis(
  config: z.infer<typeof analyzeSchema>,
  jobId: string
): Promise<void> {
  try {
    console.log(`Starting analysis job ${jobId} for project ${config.projectId}`)

    // Process each analysis type
    for (const analysisType of config.analysisTypes) {
      console.log(`Running ${analysisType} analysis...`)

      // Simulate analysis processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

      // Generate sample analysis result based on type
      const result = generateSampleResult(analysisType)
      const confidence = 0.75 + Math.random() * 0.25
      const insights = generateSampleInsights(analysisType)

      // Store analysis result
      await query(`
        INSERT INTO analyzed_data (
          project_id, analysis_type, result, confidence_score, insights, category, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        config.projectId,
        analysisType,
        JSON.stringify(result),
        confidence,
        insights,
        getCategoryForType(analysisType),
        [analysisType, config.projectId.slice(0, 8)]
      ])

      // Auto-generate insights if enabled
      if (config.generateInsights) {
        await generateInsightFromAnalysis(config.projectId, analysisType, result)
      }
    }

    // Log completion
    await query(`
      INSERT INTO audit_log (project_id, action, entity_type, actor_type, details)
      VALUES ($1, 'analysis_completed', 'analyzed_data', 'ai_agent', $2)
    `, [config.projectId, JSON.stringify({ jobId, typesCompleted: config.analysisTypes })])

    console.log(`Analysis job ${jobId} completed`)
  } catch (error) {
    // Log failure
    await query(`
      INSERT INTO audit_log (project_id, action, entity_type, actor_type, details)
      VALUES ($1, 'analysis_failed', 'analyzed_data', 'system', $2)
    `, [config.projectId, JSON.stringify({ jobId, error: String(error) })])
    
    throw error
  }
}

/**
 * Generates sample analysis result based on type
 */
function generateSampleResult(type: string): Record<string, unknown> {
  switch (type) {
    case 'sentiment':
      return {
        overallSentiment: Math.random() > 0.5 ? 'positive' : 'negative',
        sentimentScore: Math.round((Math.random() * 2 - 1) * 100) / 100,
        breakdown: {
          positive: Math.round(Math.random() * 50 + 25),
          negative: Math.round(Math.random() * 25),
          neutral: Math.round(Math.random() * 25)
        },
        keyPhrases: ['great product', 'good value', 'needs improvement']
      }
    
    case 'trend_detection':
      return {
        trends: [
          { name: 'AI adoption increasing', direction: 'up', strength: 0.8 },
          { name: 'Price sensitivity rising', direction: 'up', strength: 0.6 },
          { name: 'Traditional methods declining', direction: 'down', strength: 0.7 }
        ],
        timeframe: '30d',
        confidence: 0.82
      }
    
    case 'competitor_comparison':
      return {
        comparisonMatrix: {
          features: { us: 85, competitorAvg: 72 },
          pricing: { us: 70, competitorAvg: 75 },
          marketPresence: { us: 65, competitorAvg: 80 },
          innovation: { us: 90, competitorAvg: 68 }
        },
        recommendations: ['Focus on differentiation', 'Improve pricing strategy']
      }
    
    case 'entity_extraction':
      return {
        entities: [
          { text: 'Company A', type: 'organization', confidence: 0.95 },
          { text: 'John Smith', type: 'person', confidence: 0.88 },
          { text: '$1M', type: 'money', confidence: 0.92 }
        ]
      }
    
    case 'summary':
      return {
        executiveSummary: 'Key findings indicate growing market opportunity...',
        keyPoints: ['Market is expanding', 'Competition is fragmented'],
        recommendations: ['Enter market now', 'Focus on X segment']
      }
    
    default:
      return { analysisComplete: true, type }
  }
}

/**
 * Generates sample insights for an analysis type
 */
function generateSampleInsights(type: string): string[] {
  const insightTemplates: Record<string, string[]> = {
    sentiment: ['Overall positive sentiment detected', 'Customers value quality over price'],
    trend_detection: ['Emerging pattern in user behavior', 'Seasonal variation observed'],
    competitor_comparison: ['Competitor weakness identified in support', 'Pricing gap opportunity found'],
    entity_extraction: ['Key stakeholders identified', 'Financial metrics extracted'],
    topic_modeling: ['Primary themes categorized', 'Niche topics discovered'],
    pricing_extraction: ['Price ranges documented', 'Discount patterns identified'],
    summary: ['Main conclusions synthesized', 'Action items generated']
  }
  
  return insightTemplates[type] || ['Analysis completed']
}

/**
 * Maps analysis type to category
 */
function getCategoryForType(type: string): string {
  const categoryMap: Record<string, string> = {
    sentiment: 'customer_feedback',
    trend_detection: 'market_dynamics',
    competitor_comparison: 'competitive_intelligence',
    entity_extraction: 'data_extraction',
    topic_modeling: 'content_analysis',
    pricing_extraction: 'pricing_intelligence',
    summary: 'executive_summary'
  }
  return categoryMap[type] || 'general'
}

/**
 * Generates insight entry from analysis result
 */
async function generateInsightFromAnalysis(
  projectId: string,
  analysisType: string,
  result: Record<string, unknown>
): Promise<void> {
  const insightTypeMap: Record<string, string> = {
    sentiment: 'customer_need',
    trend_detection: 'trend',
    competitor_comparison: 'competitive_move',
    pricing_extraction: 'price_change'
  }

  const insightType = insightTypeMap[analysisType] || 'opportunity'

  await query(`
    INSERT INTO market_intelligence (
      project_id, insight_type, title, description,
      impact_score, confidence_level, metrics, source_evidence, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new')
  `, [
    projectId,
    insightType,
    `${analysisType.replace('_', ' ').toUpperCase()} Insight`,
    `Automatically generated insight from ${analysisType} analysis`,
    Math.round((5 + Math.random() * 5) * 10) / 10,
    0.7 + Math.random() * 0.3,
    JSON.stringify(result),
    JSON.stringify([{ source: 'ai_analysis', type: analysisType }])
  ])
}

/**
 * Estimates analysis duration based on data size
 */
function estimateAnalysisDuration(analysisTypes: number, dataPoints: number): string {
  const baseTime = analysisTypes * 30 // seconds per type
  const dataFactor = Math.min(dataPoints / 1000, 5) // scale factor
  const totalSeconds = baseTime * (1 + dataFactor)
  
  if (totalSeconds < 60) return `${Math.ceil(totalSeconds)} seconds`
  return `${Math.ceil(totalSeconds / 60)}-${Math.ceil(totalSeconds / 60 + 1)} minutes`
}
