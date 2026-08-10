/**
 * Single Project API Route
 * 
 * Handles operations on individual research projects:
 * - GET: Retrieve project details with aggregated statistics
 * - PATCH: Update project properties
 * - DELETE: Archive (soft delete) a project
 * 
 * @module api/research/projects/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

/**
 * Zod schema for validating project updates
 */
const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  targetMarket: z.string().max(255).optional(),
  competitors: z.array(z.string()).max(20).optional(),
  keywords: z.array(z.string()).max(50).optional(),
  researchType: z.enum([
    'competitive_analysis',
    'market_trends',
    'customer_sentiment',
    'pricing_analysis',
    'comprehensive'
  ]).optional(),
  status: z.enum(['draft', 'running', 'completed', 'failed', 'archived']).optional(),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * Interface for project statistics aggregation
 */
interface ProjectStats {
  totalSources: number
  successfulSources: number
  totalDataPoints: number
  totalAnalyses: number
  totalInsights: number
  competitorsTracked: number
}

/**
 * Interface for complete project response
 */
interface ProjectWithStats {
  project: Record<string, unknown>
  stats: ProjectStats
  recentActivity: Array<{
    action: string
    timestamp: string
    details: unknown
  }>
}

/**
 * GET /api/research/projects/[id]
 * 
 * Retrieves detailed information about a specific project including:
 * - Basic project information
 * - Aggregated statistics from related tables
 * - Recent activity from audit log
 * 
 * @param id - Project UUID from URL parameter
 * @returns Complete project data with statistics
 * 
 * @example
 * GET /api/research/projects/550e8400-e29b-41d4-a716-446655440000
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch main project record
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

    // Fetch aggregated statistics using the dashboard view
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT ds.id) as "totalSources",
        COUNT(DISTINCT CASE WHEN ds.status = 'success' THEN ds.id END) as "successfulSources",
        COUNT(DISTINCT rd.id) as "totalDataPoints",
        COUNT(DISTINCT ad.id) as "totalAnalyses",
        COUNT(DISTINCT mi.id) as "totalInsights",
        COUNT(DISTINCT cp.id) as "competitorsTracked"
      FROM research_projects p
      LEFT JOIN data_sources ds ON p.id = ds.project_id
      LEFT JOIN raw_data rd ON p.id = rd.project_id
      LEFT JOIN analyzed_data ad ON p.id = ad.project_id
      LEFT JOIN market_intelligence mi ON p.id = mi.project_id
      LEFT JOIN competitor_profiles cp ON p.id = cp.project_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id])

    const stats: ProjectStats = statsResult.rows[0] ? {
      totalSources: parseInt(statsResult.rows[0].totalSources || '0', 10),
      successfulSources: parseInt(statsResult.rows[0].successfulSources || '0', 10),
      totalDataPoints: parseInt(statsResult.rows[0].totalDataPoints || '0', 10),
      totalAnalyses: parseInt(statsResult.rows[0].totalAnalyses || '0', 10),
      totalInsights: parseInt(statsResult.rows[0].totalInsights || '0', 10),
      competitorsTracked: parseInt(statsResult.rows[0].competitorsTracked || '0', 10)
    } : {
      totalSources: 0,
      successfulSources: 0,
      totalDataPoints: 0,
      totalAnalyses: 0,
      totalInsights: 0,
      competitorsTracked: 0
    }

    // Fetch recent activity (last 10 actions)
    const activityResult = await query(`
      SELECT action, created_at as timestamp, details
      FROM audit_log
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [id])

    const response: ProjectWithStats = {
      project,
      stats,
      recentActivity: activityResult.rows
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Error fetching project details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project details' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/research/projects/[id]
 * 
 * Updates specific fields of a research project.
 * Only provided fields will be updated (partial update).
 * 
 * @param id - Project UUID from URL parameter
 * @param body - Fields to update (must match updateProjectSchema)
 * @returns Updated project data
 * 
 * @example
 * PATCH /api/research/projects/550e8400-e29b-41d4-a716-446655440000
 * Content-Type: application/json
 * {
 *   "status": "running",
 *   "name": "Updated Project Name"
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if project exists
    const existingProject = await query(
      'SELECT * FROM research_projects WHERE id = $1',
      [id]
    )

    if (existingProject.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body: unknown = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    // Build dynamic UPDATE query based on provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    const fieldMapping: Record<string, string> = {
      name: 'name',
      description: 'description',
      targetMarket: 'target_market',
      competitors: 'competitors',
      keywords: 'keywords',
      researchType: 'research_type',
      status: 'status',
      metadata: 'metadata'
    }

    for (const [key, dbColumn] of Object.entries(fieldMapping)) {
      const value = (validatedData as Record<string, unknown>)[key]
      if (value !== undefined) {
        updates.push(`${dbColumn} = $${paramIndex++}`)
        values.push(dbColumn === 'metadata' ? JSON.stringify(value) : value)
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    values.push(id) // For WHERE clause
    const sql = `UPDATE research_projects SET ${updates.join(', ')} WHERE id = $${paramIndex++} RETURNING *`

    const result = await query(sql, values)

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Project updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/research/projects/[id]
 * 
 * Soft deletes a project by setting status to 'archived'.
 * Does not actually remove data to preserve research history.
 * 
 * @param id - Project UUID from URL parameter
 * @returns Confirmation of archival
 * 
 * @example
 * DELETE /api/research/projects/550e8400-e29b-41d4-a716-446655440000
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if project exists
    const existingProject = await query(
      'SELECT * FROM research_projects WHERE id = $1',
      [id]
    )

    if (existingProject.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Soft delete - archive instead of removing
    await query(
      `UPDATE research_projects SET status = 'archived' WHERE id = $1`,
      [id]
    )

    // Log the archive action
    await query(
      `INSERT INTO audit_log (project_id, action, entity_type, entity_id, actor_type, details)
       VALUES ($1, 'archive', 'research_projects', $1, 'user', '{}')`,
      [id]
    )

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully'
    })
  } catch (error) {
    console.error('Error archiving project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to archive project' },
      { status: 500 }
    )
  }
}
