/**
 * Dashboard Statistics API Route
 * 
 * Provides aggregated statistics for the main dashboard.
 * Optimized for fast loading with pre-computed aggregations.
 * 
 * @module api/dashboard/stats
 */

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
  // Project metrics
  totalProjects: number
  activeProjects: number
  completedProjects: number
  failedProjects: number
  
  // Data collection metrics
  totalDataPoints: number
  totalSourcesAnalyzed: number
  
  // Analysis metrics
  totalAnalyses: number
  averageConfidence: number
  
  // Intelligence metrics
  totalInsights: number
  highImpactInsights: number
  insightsByType: Record<string, number>
  
  // Competitor metrics
  competitorsTracked: number
  
  // Recent activity
  recentProjects: Array<{
    id: string
    name: string
    status: string
    progress: number
    research_type: string
    created_at: string
  }>
  recentInsights: Array<{
    id: string
    title: string
    insight_type: string
    impact_score: number | null
    detected_at: string
  }>
  
  // Time-based trends (last 30 days)
  projectsByDay: Array<{ date: string; count: number }>
  analysesByType: Array<{ type: string; count: number }>
}

/**
 * GET /api/dashboard/stats
 * 
 * Returns comprehensive dashboard statistics including:
 * - Project counts by status
 * - Data collection metrics
 * - Analysis statistics
 * - Intelligence summaries
 * - Recent activity feeds
 * - Trend data for charts
 * 
 * This endpoint is optimized to make efficient use of database queries
 * and returns all dashboard data in a single request.
 * 
 * @example
 * GET /api/dashboard/stats
 */
export async function GET() {
  try {
    // Execute all independent queries in parallel for performance
    const [
      projectStats,
      dataMetrics,
      analysisMetrics,
      intelligenceMetrics,
      competitorCount,
      recentProjects,
      recentInsights,
      projectTrends,
      analysisBreakdown
    ] = await Promise.all([
      // 1. Project status counts
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status IN ('draft', 'running')) as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM research_projects
        WHERE status != 'archived'
      `),
      
      // 2. Data collection metrics
      query(`
        SELECT 
          COUNT(DISTINCT rd.id) as data_points,
          COUNT(DISTINCT ds.id) as sources_analyzed,
          COALESCE(SUM(ds.pages_scraped), 0) as pages_scraped
        FROM raw_data rd
        FULL OUTER JOIN data_sources ds ON 1=1
        WHERE rd.id IS NOT NULL OR ds.id IS NOT NULL
      `),
      
      // 3. Analysis metrics
      query(`
        SELECT 
          COUNT(*) as total_analyses,
          ROUND(AVG(confidence_score)::numeric, 3) as avg_confidence,
          COUNT(DISTINCT project_id) as projects_analyzed
        FROM analyzed_data
      `),
      
      // 4. Intelligence metrics with type breakdown
      query(`
        SELECT 
          COUNT(*) as total_insights,
          COUNT(*) FILTER (WHERE impact_score >= 7) as high_impact,
          insight_type,
          COUNT(*) as type_count
        FROM market_intelligence
        WHERE status IN ('new', 'verified')
        GROUP BY insight_type
      `),
      
      // 5. Competitor count
      query(`SELECT COUNT(*) as count FROM competitor_profiles`),
      
      // 6. Recent projects (last 5)
      query(`
        SELECT id, name, status, progress, research_type, created_at
        FROM research_projects
        WHERE status != 'archived'
        ORDER BY updated_at DESC
        LIMIT 5
      `),
      
      // 7. Recent insights (last 10)
      query(`
        SELECT id, title, insight_type, impact_score, detected_at
        FROM market_intelligence
        WHERE status IN ('new', 'verified')
        ORDER BY detected_at DESC
        LIMIT 10
      `),
      
      // 8. Projects created in last 30 days (for trend chart)
      query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM research_projects
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `),
      
      // 9. Analysis breakdown by type
      query(`
        SELECT 
          analysis_type as type,
          COUNT(*) as count
        FROM analyzed_data
        GROUP BY analysis_type
        ORDER BY count DESC
      `)
    ])

    // Process project stats
    const projectRow = projectStats.rows[0] || {}
    
    // Process data metrics
    const dataRow = dataMetrics.rows[0] || {}
    
    // Process analysis metrics
    const analysisRow = analysisMetrics.rows[0] || {}
    
    // Process intelligence metrics and build type breakdown
    let totalInsights = 0
    let highImpactInsights = 0
    const insightsByType: Record<string, number> = {}
    
    intelligenceMetrics.rows.forEach((row: Record<string, unknown>) => {
      totalInsights += parseInt(row.total_insights || '0', 10)
      if (row.high_impact) {
        highImpactInsights += parseInt(row.high_impact.toString(), 10)
      }
      insightsByType[row.insight_type as string] = parseInt(row.type_count || '0', 10)
    })
    
    // Build response object
    const stats: DashboardStats = {
      // Project metrics
      totalProjects: parseInt(projectRow.total || '0', 10),
      activeProjects: parseInt(projectRow.active || '0', 10),
      completedProjects: parseInt(projectRow.completed || '0', 10),
      failedProjects: parseInt(projectRow.failed || '0', 10),
      
      // Data collection metrics
      totalDataPoints: parseInt(dataRow.data_points || '0', 10),
      totalSourcesAnalyzed: parseInt(dataRow.sources_analyzed || '0', 10),
      
      // Analysis metrics
      totalAnalyses: parseInt(analysisRow.total_analyses || '0', 10),
      averageConfidence: parseFloat(analysisRow.avg_confidence || '0'),
      
      // Intelligence metrics
      totalInsights,
      highImpactInsights,
      insightsByType,
      
      // Competitor metrics
      competitorsTracked: parseInt(competitorCount.rows[0]?.count || '0', 10),
      
      // Recent activity
      recentProjects: recentProjects.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        status: row.status as string,
        progress: row.progress as number,
        research_type: row.research_type as string,
        created_at: row.created_at as string
      })),
      
      recentInsights: recentInsights.rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: row.title as string,
        insight_type: row.insight_type as string,
        impact_score: row.impact_score as number | null,
        detected_at: row.detected_at as string
      })),
      
      // Trend data
      projectsByDay: projectTrends.rows.map((row: Record<string, unknown>) => ({
        date: row.date as string,
        count: parseInt(row.count || '0', 10)
      })),
      
      analysesByType: analysisBreakdown.rows.map((row: Record<string, unknown>) => ({
        type: row.type as string,
        count: parseInt(row.count || '0', 10)
      }))
    }

    return NextResponse.json({
      success: true,
      data: stats,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}
