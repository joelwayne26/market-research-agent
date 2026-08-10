/**
 * Research Projects API Route
 * 
 * This module handles CRUD operations for market research projects.
 * It demonstrates:
 * - RESTful API design patterns
 * - Input validation with Zod
 * - Database operations with PostgreSQL
 * - Proper error handling and response formatting
 * 
 * @module api/research/projects
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

/**
 * Zod schema for validating project creation requests
 * Ensures data integrity at the API boundary
 */
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(2000).optional().default(''),
  targetMarket: z.string().max(255).optional(),
  competitors: z.array(z.string()).max(20).optional().default([]),
  keywords: z.array(z.string()).max(50).optional().default([]),
  researchType: z.enum([
    'competitive_analysis',
    'market_trends',
    'customer_sentiment',
    'pricing_analysis',
    'comprehensive'
  ]).optional().default('comprehensive'),
  createdBy: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
})

/**
 * Type for validated project creation data
 */
type CreateProjectInput = z.infer<typeof createProjectSchema>

/**
 * Interface representing a research project from the database
 */
export interface ResearchProject {
  id: string
  name: string
  description: string
  target_market: string | null
  competitors: string[] | null
  keywords: string[] | null
  research_type: string
  status: string
  progress: number
  total_sources_analyzed: number
  key_findings: unknown[]
  created_at: string
  updated_at: string
  completed_at: string | null
  created_by: string | null
  metadata: Record<string, unknown>
}

/**
 * GET /api/research/projects
 * 
 * Retrieves all research projects with optional filtering.
 * Supports query parameters:
 * - status: Filter by project status (draft, running, completed, failed, archived)
 * - type: Filter by research type
 * - limit: Maximum number of results (default: 20)
 * - offset: Number of results to skip (for pagination)
 * 
 * @example
 * // Get all running projects
 * GET /api/research/projects?status=running
 * 
 * @example
 * // Get paginated competitive analysis projects
 * GET /api/research/projects?type=competitive_analysis&limit=10&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters with defaults
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build dynamic query based on filters
    let sql = `
      SELECT *, 
        COUNT(*) OVER() as total_count
      FROM research_projects 
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (status) {
      sql += ` AND status = $${paramIndex++}`
      params.push(status)
    }

    if (type) {
      sql += ` AND research_type = $${paramIndex++}`
      params.push(type)
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await query(sql, params)
    const totalCount = result.rows[0]?.total_count || 0

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(totalCount, 10),
        limit,
        offset,
        hasMore: offset + limit < parseInt(totalCount, 10)
      }
    })
  } catch (error) {
    console.error('Error fetching research projects:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch research projects' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/research/projects
 * 
 * Creates a new research project.
 * Validates input using Zod schema before database insertion.
 * 
 * @param body - Project creation data matching CreateProjectInput schema
 * @returns Created project with generated ID and timestamps
 * 
 * @example
 * POST /api/research/projects
 * Content-Type: application/json
 * {
 *   "name": "E-commerce Analysis",
 *   "description": "Analyze top e-commerce platforms",
 *   "targetMarket": "E-commerce Software",
 *   "competitors": ["Shopify", "BigCommerce"],
 *   "keywords": ["e-commerce", "online store"],
 *   "researchType": "competitive_analysis"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body: unknown = await request.json()
    const validatedData: CreateProjectInput = createProjectSchema.parse(body)

    // Generate unique ID for new project
    const id = uuidv4()

    // Insert new project into database
    const sql = `
      INSERT INTO research_projects (
        id, name, description, target_market, competitors, keywords,
        research_type, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `

    const params = [
      id,
      validatedData.name,
      validatedData.description,
      validatedData.targetMarket || null,
      validatedData.competitors,
      validatedData.keywords,
      validatedData.researchType,
      validatedData.createdBy || null,
      JSON.stringify(validatedData.metadata)
    ]

    const result = await query(sql, params)
    const project = result.rows[0]

    // Log creation to audit trail
    await query(
      `INSERT INTO audit_log (project_id, action, entity_type, entity_id, actor_type, details)
       VALUES ($1, 'create', 'research_projects', $1, 'user', $2)`,
      [id, JSON.stringify({ projectName: validatedData.name })]
    )

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Research project created successfully'
    }, { status: 201 })
  } catch (error) {
    // Handle Zod validation errors specifically
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    console.error('Error creating research project:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create research project' },
      { status: 500 }
    )
  }
}
