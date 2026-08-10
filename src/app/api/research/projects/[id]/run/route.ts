/**
 * Research Execution API Route
 * 
 * Triggers and manages the execution of a research project.
 * This endpoint:
 * - Starts the research pipeline
 * - Updates project status and progress
 * - Returns real-time progress information
 * 
 * @module api/research/projects/[id]/run
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

/**
 * Schema for research run configuration
 */
const runResearchSchema = z.object({
  // Execution options
  forceRestart: z.boolean().optional().default(false),
  skipScraping: z.boolean().optional().default(false),
  skipAnalysis: z.boolean().optional().default(false),
  
  // Scraping configuration
  maxSources: z.number().int().min(1).max(100).optional().default(50),
  scrapeDepth: z.enum(['shallow', 'medium', 'deep']).optional().default('medium'),
  
  // Analysis configuration
  enableSentimentAnalysis: z.boolean().optional().default(true),
  enableTrendDetection: z.boolean().optional().default(true),
  enableCompetitorAnalysis: z.boolean().optional().default(true),
  
  // Callback URL for progress updates (webhook)
  webhookUrl: z.string().url().optional(),
})

/**
 * Research pipeline stages for progress tracking
 */
enum PipelineStage {
  INITIALIZING = 'initializing',
  SCRAPING = 'scraping',
  ANALYZING = 'analyzing',
  GENERATING_INSIGHTS = 'generating_insights',
  COMPLETING = 'completing',
}

/**
 * Stage progress percentages
 */
const STAGE_PROGRESS: Record<PipelineStage, number> = {
  [PipelineStage.INITIALIZING]: 5,
  [PipelineStage.SCRAPING]: 35,
  [PipelineStage.ANALYZING]: 70,
  [PipelineStage.GENERATING_INSIGHTS]: 90,
  [PipelineStage.COMPLETING]: 100,
}

/**
 * POST /api/research/projects/[id]/run
 * 
 * Starts or resumes research execution for a project.
 * The actual processing happens asynchronously.
 * 
 * @param id - Project UUID from URL parameter
 * @param body - Run configuration options
 * @returns Initial response with job ID for tracking
 * 
 * @example
 * POST /api/research/projects/550e8400-e29b-41d4-a716-446655440000/run
 * Content-Type: application/json
 * {
 *   "maxSources": 30,
 *   "scrapeDepth": "deep",
 *   "enableSentimentAnalysis": true
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate project exists
    const projectResult = await query(
      'SELECT * FROM research_projects WHERE id = $1',
      [id]
    )

    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const project = projectResult.rows[0]

    // Check if project can be run
    if (project.status === 'running') {
      return NextResponse.json(
        { success: false, error: 'Project is already running' },
        { status: 409 }
      )
    }

    if (project.status === 'archived') {
      return NextResponse.json(
        { success: false, error: 'Cannot run an archived project' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body: unknown = await request.json().catch(() => ({}))
    const config = runResearchSchema.parse(body)

    // If completed and not forcing restart, return current results
    if (project.status === 'completed' && !config.forceRestart) {
      return NextResponse.json({
        success: true,
        message: 'Project already completed. Use forceRestart to re-run.',
        data: {
          status: project.status,
          progress: project.progress,
          completedAt: project.completed_at
        }
      })
    }

    // Update project status to running
    await query(
      `UPDATE research_projects 
       SET status = 'running', progress = 0, updated_at = NOW()
       WHERE id = $1`,
      [id]
    )

    // Log the start action
    await query(
      `INSERT INTO audit_log (project_id, action, entity_type, entity_id, actor_type, details)
       VALUES ($1, 'run_started', 'research_projects', $1, 'user', $2)`,
      [id, JSON.stringify(config)]
    )

    // Start asynchronous research pipeline
    // In production, this would use a job queue like Bull or Redis Queue
    executeResearchPipeline(id, config).catch(error => {
      console.error('Research pipeline failed:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Research execution started',
      data: {
        projectId: id,
        status: 'running',
        estimatedDuration: estimateDuration(config),
        stages: Object.values(PipelineStage)
      }
    }, { status: 202 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error starting research:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start research execution' },
      { status: 500 }
    )
  }
}

/**
 * Executes the research pipeline asynchronously
 * This simulates the full pipeline - in production would use actual scrapers and AI
 */
async function executeResearchPipeline(
  projectId: string,
  config: z.infer<typeof runResearchSchema>
): Promise<void> {
  try {
    // Stage 1: Initialization
    await updateProgress(projectId, PipelineStage.INITIALIZING, 0)
    await simulateDelay(1000)

    // Stage 2: Data Collection (Scraping)
    if (!config.skipScraping) {
      await updateProgress(projectId, PipelineStage.SCRAPING, 5)
      
      // Create data source records based on project competitors/keywords
      const projectData = await query(
        'SELECT competitors, keywords FROM research_projects WHERE id = $1',
        [projectId]
      )
      
      const { competitors = [], keywords = [] } = projectData.rows[0] || {}
      const sources = [...(competitors || []), ...(keywords || [])].slice(0, config.maxSources)
      
      for (let i = 0; i < sources.length; i++) {
        // Create data source entry
        await query(`
          INSERT INTO data_sources (project_id, source_type, name, url, status)
          VALUES ($1, $2, $3, $4, 'success')
        `, [projectId, 'website', sources[i], `https://example.com/${sources[i]}`])
        
        // Simulate scraping delay
        await simulateDelay(50)
        
        // Update progress during scraping
        const scrapeProgress = 5 + Math.floor((i / sources.length) * 30)
        await updateProgress(projectId, PipelineStage.SCRAPING, scrapeProgress)
      }
    }

    // Stage 3: Analysis
    if (!config.skipAnalysis) {
      await updateProgress(projectId, PipelineStage.ANALYZING, 35)
      
      const analysisTypes = []
      if (config.enableSentimentAnalysis) analysisTypes.push('sentiment')
      if (config.enableTrendDetection) analysisTypes.push('trend_detection')
      if (config.enableCompetitorAnalysis) analysisTypes.push('competitor_comparison')

      for (let i = 0; i < analysisTypes.length; i++) {
        // Create analyzed data entries
        await query(`
          INSERT INTO analyzed_data (project_id, analysis_type, result, confidence_score, insights)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          projectId,
          analysisTypes[i],
          JSON.stringify({ summary: `Sample ${analysisTypes[i]} results` }),
          0.85 + Math.random() * 0.15,
          [`Key insight from ${analysisTypes[i]}`]
        ])
        
        await simulateDelay(200)
        
        const analysisProgress = 35 + Math.floor(((i + 1) / analysisTypes.length) * 35)
        await updateProgress(projectId, PipelineStage.ANALYSIS as any, analysisProgress)
      }
    }

    // Stage 4: Generate Insights
    await updateProgress(projectId, PipelineStage.GENERATING_INSIGHTS, 70)
    
    // Generate market intelligence entries
    const insightTypes = ['trend', 'opportunity', 'threat', 'competitive_move']
    for (let i = 0; i < 5; i++) {
      await query(`
        INSERT INTO market_intelligence (
          project_id, insight_type, title, description, 
          impact_score, confidence_level, metrics, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
      `, [
        projectId,
        insightTypes[i % insightTypes.length],
        `Generated Insight ${i + 1}`,
        `This is an AI-generated insight about the target market`,
        Math.round((5 + Math.random() * 5) * 10) / 10,
        Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
        JSON.stringify({ relevanceScore: Math.random() })
      ])
      
      await simulateDelay(100)
    }

    // Stage 5: Completion
    await updateProgress(projectId, PipelineStage.COMPLETING, 95)
    
    // Mark project as completed
    await query(`
      UPDATE research_projects 
      SET status = 'completed', 
          progress = 100,
          total_sources_analyzed = (SELECT COUNT(*) FROM data_sources WHERE project_id = $1),
          key_findings = (
            SELECT COALESCE(jsonb_agg(jsonb_build_object('title', title, 'type', insight_type)), '[]'::jsonb)
            FROM market_intelligence WHERE project_id = $1 LIMIT 10
          ),
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [projectId])

    // Log completion
    await query(`
      INSERT INTO audit_log (project_id, action, entity_type, entity_id, actor_type, details)
      VALUES ($1, 'run_completed', 'research_projects', $1, 'ai_agent', '{"duration_ms": 0}')
    `, [projectId])

  } catch (error) {
    // Mark project as failed on error
    await query(`
      UPDATE research_projects 
      SET status = 'failed', updated_at = NOW()
      WHERE id = $1
    `, [projectId])

    await query(`
      INSERT INTO audit_log (project_id, action, entity_type, entity_id, actor_type, details)
      VALUES ($1, 'run_failed', 'research_projects', $1, 'system', $2)
    `, [projectId, JSON.stringify({ error: String(error) })])
    
    throw error
  }
}

/**
 * Helper function to update project progress
 */
async function updateProgress(
  projectId: string, 
  stage: PipelineStage, 
  baseProgress: number
): Promise<void> {
  await query(`
    UPDATE research_projects 
    SET progress = $2, updated_at = NOW()
    WHERE id = $1
  `, [projectId, baseProgress])
}

/**
 * Simulates async delay for demo purposes
 */
function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Estimates total duration based on configuration
 */
function estimateDuration(config: z.infer<typeof runResearchSchema>): string {
  let baseMinutes = 2
  if (!config.skipScraping) baseMinutes += config.maxSources * 0.1
  if (!config.skipAnalysis) baseMinutes += 3
  return `${Math.ceil(baseMinutes)}- ${Math.ceil(baseMinutes * 1.5)} minutes`
}
