/**
 * Competitor Profiles API Route
 * 
 * Manages competitor intelligence data including:
 * - Company information
 * - Market positioning analysis
 * - Pricing data
 * - Digital presence metrics
 * 
 * @module api/competitors
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

/**
 * Competitor profile interface
 */
export interface CompetitorProfile {
  id: string
  project_id: string
  name: string
  website: string | null
  description: string | null
  founded_year: number | null
  employee_count_estimate: string | null
  funding_info: string | null
  revenue_estimate: string | null
  alexa_rank: number | null
  monthly_visits_estimate: bigint | null
  social_followers: Record<string, unknown>
  strengths: string[] | null
  weaknesses: string[] | null
  market_positioning: string | null
  unique_value_proposition: string | null
  pricing_data: unknown[]
  pricing_last_updated: string | null
  created_at: string
  updated_at: string
}

/**
 * Query parameters schema for listing competitors
 */
const listCompetitorsSchema = z.object({
  projectId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

/**
 * Schema for creating new competitor profile
 */
const createCompetitorSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  website: z.string().url().max(500).optional(),
  description: z.string().max(2000).optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  employeeCountEstimate: z.string().max(100).optional(),
  fundingInfo: z.string().max(500).optional(),
  revenueEstimate: z.string().max(100).optional(),
  marketPositioning: z.string().max(1000).optional(),
  uniqueValueProposition: z.string().max(500).optional(),
})

/**
 * GET /api/competitors
 * 
 * Retrieves competitor profiles with optional filtering and search.
 * Supports text search across name, description, and positioning fields.
 * 
 * @query projectId - Filter by project ID
 * @query search - Text search term (searches name, description)
 * @query limit - Maximum results (default: 20)
 * @query offset - Pagination offset (default: 0)
 * 
 * @example
 * // Search for competitors with "shopify" in name
 * GET /api/competitors?search=shopify
 * 
 * @example
 * // Get all competitors for a project
 * GET /api/competitors?projectId=xxx&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    const validated = listCompetitorsSchema.safeParse(queryParams)
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: validated.error.errors },
        { status: 400 }
      )
    }

    const { projectId, search, limit, offset } = validated.data

    let sql = `
      SELECT cp.*, p.name as project_name,
             COUNT(*) OVER() as total_count
      FROM competitor_profiles cp
      LEFT JOIN research_projects p ON cp.project_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (projectId) {
      sql += ` AND cp.project_id = $${paramIndex++}`
      params.push(projectId)
    }

    if (search) {
      sql += ` AND (cp.name ILIKE $${paramIndex} OR cp.description ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    sql += ` ORDER BY cp.name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await query(sql, params)
    const totalCount = result.rows[0]?.total_count || 0

    // Parse JSON fields
    const competitors = result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      social_followers: typeof row.social_followers === 'string' 
        ? JSON.parse(row.social_followers) 
        : row.social_followers || {},
      pricing_data: typeof row.pricing_data === 'string'
        ? JSON.parse(row.pricing_data)
        : row.pricing_data || [],
      strengths: Array.isArray(row.strengths) ? row.strengths : [],
      weaknesses: Array.isArray(row.weaknesses) ? row.weaknesss : [],
    }))

    return NextResponse.json({
      success: true,
      data: competitors,
      pagination: {
        total: parseInt(totalCount, 10),
        limit,
        offset,
        hasMore: offset + limit < parseInt(totalCount, 10)
      }
    })
  } catch (error) {
    console.error('Error fetching competitors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch competitor profiles' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/competitors
 * 
 * Creates a new competitor profile.
 * Automatically initializes empty arrays for strengths, weaknesses, and pricing data.
 * 
 * @body projectId - Required project association
 * @body name - Competitor company name
 * @body website - Official website URL
 * @body description - Company description
 * @body foundedYear - Year company was founded
 * @body employeeCountEstimate - Estimated employee count range
 * @body fundingInfo - Known funding information
 * @body revenueEstimate - Revenue estimate
 * @body marketPositioning - How they position in market
 * @body uniqueValueProposition - Their UVP statement
 * 
 * @example
 * POST /api/competitors
 * {
 *   "projectId": "uuid",
 *   "name": "Competitor Inc",
 *   "website": "https://competitor.com",
 *   "marketPositioning": "Enterprise-focused solution"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createCompetitorSchema.parse(body)

    const id = uuidv4()

    const sql = `
      INSERT INTO competitor_profiles (
        id, project_id, name, website, description,
        founded_year, employee_count_estimate, funding_info,
        revenue_estimate, market_positioning, unique_value_proposition,
        strengths, weaknesses, social_followers, pricing_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, '{}', '{}', '{}'::jsonb, '[]'::jsonb)
      RETURNING *
    `

    const result = await query(sql, [
      id,
      validated.projectId,
      validated.name,
      validated.website || null,
      validated.description || null,
      validated.foundedYear || null,
      validated.employeeCountEstimate || null,
      validated.fundingInfo || null,
      validated.revenueEstimate || null,
      validated.marketPositioning || null,
      validated.uniqueValueProposition || null,
    ])

    // Log creation
    await query(`
      INSERT INTO audit_log (project_id, action, entity_type, entity_id, actor_type, details)
      VALUES ($1, 'create_competitor', 'competitor_profiles', $2, 'user', $3)
    `, [validated.projectId, id, JSON.stringify({ name: validated.name })])

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Competitor profile created successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating competitor profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create competitor profile' },
      { status: 500 }
    )
  }
}
