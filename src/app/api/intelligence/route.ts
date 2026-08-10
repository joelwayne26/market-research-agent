/**
 * Market Intelligence API Route
 * 
 * Provides access to AI-generated market insights and trends.
 * Supports filtering by type, project, and time range.
 * 
 * @module api/intelligence
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

/**
 * Valid insight types for filtering
 */
const VALID_INSIGHT_TYPES = [
  'trend',
  'opportunity',
  'threat',
  'competitive_move',
  'customer_need',
  'price_change',
  'market_shift'
] as const

/**
 * Query parameters schema
 */
const intelligenceQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  type: z.enum(VALID_INSIGHT_TYPES).optional(),
  status: z.enum(['new', 'verified', 'acted_upon', 'dismissed', 'expired']).optional(),
  minImpact: z.number().min(0).max(10).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

/**
 * Interface for market intelligence item
 */
export interface MarketIntelligence {
  id: string
  project_id: string
  insight_type: string
  title: string
  description: string | null
  metrics: Record<string, unknown>
  impact_score: number | null
  confidence_level: number | null
  detected_at: string
  valid_until: string | null
  status: string
  created_at: string
  // Joined fields
  project_name?: string
  target_market?: string
}

/**
 * GET /api/intelligence
 * 
 * Retrieves market intelligence entries with optional filtering.
 * Returns insights ordered by detection date (newest first).
 * 
 * @query projectId - Filter by specific project
 * @query type - Filter by insight type (trend, opportunity, threat, etc.)
 * @query status - Filter by status (new, verified, acted_upon, etc.)
 * @query minImpact - Minimum impact score (0-10)
 * @query limit - Maximum results to return (default: 20)
 * @query offset - Results offset for pagination
 * 
 * @example
 * // Get all high-impact opportunities
 * GET /api/intelligence?type=opportunity&minImpact=7
 * 
 * @example
 * // Get recent threats for a specific project
 * GET /api/intelligence?projectId=xxx&type=threat&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const queryParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })
    
    const validated = intelligenceQuerySchema.safeParse(queryParams)
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: validated.error.errors },
        { status: 400 }
      )
    }

    const { projectId, type, status, minImpact, limit, offset } = validated.data

    // Build dynamic query
    let sql = `
      SELECT mi.*, p.name as project_name, p.target_market,
             COUNT(*) OVER() as total_count
      FROM market_intelligence mi
      LEFT JOIN research_projects p ON mi.project_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (projectId) {
      sql += ` AND mi.project_id = $${paramIndex++}`
      params.push(projectId)
    }

    if (type) {
      sql += ` AND mi.insight_type = $${paramIndex++}`
      params.push(type)
    }

    if (status) {
      sql += ` AND mi.status = $${paramIndex++}`
      params.push(status)
    }

    if (minImpact !== undefined) {
      sql += ` AND mi.impact_score >= $${paramIndex++}`
      params.push(minImpact)
    }

    sql += ` ORDER BY mi.detected_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await query(sql, params)
    const totalCount = result.rows[0]?.total_count || 0

    return NextResponse.json({
      success: true,
      data: result.rows.map((row: Record<string, unknown>) => ({
        ...row,
        metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics as string) : row.metrics
      })),
      pagination: {
        total: parseInt(totalCount, 10),
        limit,
        offset,
        hasMore: offset + limit < parseInt(totalCount, 10)
      },
      // Summary statistics
      summary: {
        totalResults: parseInt(totalCount, 10),
        averageImpact: result.rows.length > 0 
          ? result.rows.reduce((sum: number, row: Record<string, unknown>) => 
              sum + (row.impact_score as number || 0), 0) / result.rows.length 
          : 0
      }
    })
  } catch (error) {
    console.error('Error fetching market intelligence:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market intelligence' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/intelligence
 * 
 * Creates a new market intelligence entry manually.
 * Useful for adding human-curated insights alongside AI-generated ones.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const createSchema = z.object({
      projectId: z.string().uuid(),
      insightType: z.enum(VALID_INSIGHT_TYPES),
      title: z.string().min(1).max(500),
      description: z.string().max(5000).optional(),
      impactScore: z.number().min(0).max(10).optional(),
      confidenceLevel: z.number().min(0).max(1).optional(),
      metrics: z.record(z.unknown()).optional(),
    })

    const validated = createSchema.parse(body)

    const sql = `
      INSERT INTO market_intelligence (
        project_id, insight_type, title, description,
        impact_score, confidence_level, metrics, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
      RETURNING *
    `

    const result = await query(sql, [
      validated.projectId,
      validated.insightType,
      validated.title,
      validated.description || null,
      validated.impactScore || null,
      validated.confidenceLevel || null,
      JSON.stringify(validated.metrics || {})
    ])

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Intelligence entry created successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating intelligence entry:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create intelligence entry' },
      { status: 500 }
    )
  }
}
