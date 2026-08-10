/**
 * Market Research Agent - Main Dashboard Page
 * 
 * This is the primary interface for the AI-powered market research platform.
 * Features:
 * - Real-time dashboard with live data from API
 * - Project management with create/run/view capabilities
 * - Intelligence feed with market insights
 * - Analytics visualizations
 * 
 * @page
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResearchProjectCard, ProjectData } from '@/components/research-project-card'
import { IntelligenceFeed, IntelligenceItem } from '@/components/intelligence-feed'
import { AnalyticsCharts } from '@/components/analytics-charts'
import { ResearchForm, ResearchFormData } from '@/components/research-form'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe, 
  Search,
  Plus,
  Activity,
  Target,
  Brain,
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react'

/**
 * Dashboard statistics interface from API
 */
interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  failedProjects: number
  totalDataPoints: number
  totalSourcesAnalyzed: number
  totalAnalyses: number
  averageConfidence: number
  totalInsights: number
  highImpactInsights: number
  insightsByType: Record<string, number>
  competitorsTracked: number
  recentProjects: ProjectData[]
  recentInsights: IntelligenceItem[]
  projectsByDay: Array<{ date: string; count: number }>
  analysesByType: Array<{ type: string; count: number }>
}

/**
 * View modes for the dashboard
 */
type ViewMode = 'dashboard' | 'new-project' | 'project-detail'

export default function DashboardPage() {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  /**
   * Fetches dashboard statistics from API
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setStats(result.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  /**
   * Handles manual refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStats()
  }

  /**
   * Creates a new research project
   */
  const handleCreateProject = async (formData: ResearchFormData) => {
    try {
      const response = await fetch('/api/research/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          targetMarket: formData.targetMarket,
          competitors: formData.competitors,
          keywords: formData.keywords,
          researchType: formData.researchType
        })
      })

      if (response.ok) {
        // Return to dashboard and refresh
        setViewMode('dashboard')
        await fetchStats()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Create project error:', error)
      alert('Failed to create project. Please try again.')
    }
  }

  /**
   * Runs research on a project
   */
  const handleRunResearch = async (projectId: string) => {
    try {
      const response = await fetch(`/api/research/projects/${projectId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (response.ok) {
        // Refresh stats after starting research
        setTimeout(() => fetchStats(), 2000)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to start research')
      }
    } catch (error) {
      console.error('Run research error:', error)
      alert('Failed to start research. Please try again.')
    }
  }

  /**
   * Views project details
   */
  const handleViewProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setViewMode('project-detail')
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // New Project View
  if (viewMode === 'new-project') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setViewMode('dashboard')}
            className="mb-6"
          >
            ← Back to Dashboard
          </Button>
          <ResearchForm onSubmit={handleCreateProject} onCancel={() => setViewMode('dashboard')} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Market Research Agent</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Competitive Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="sm" 
                onClick={() => setViewMode('new-project')}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.activeProjects || 0} active now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.totalDataPoints || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">From {stats?.totalSourcesAnalyzed || 0} sources</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analyses</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAnalyses || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.averageConfidence ? `${(stats.averageConfidence * 100).toFixed(0)}% avg confidence` : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insights</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalInsights || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.highImpactInsights || 0} high impact</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Competitors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.competitorsTracked || 0}</div>
              <p className="text-xs text-muted-foreground">Under monitoring</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-7">
          {/* Recent Projects */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Projects</CardTitle>
                  <CardDescription>Your ongoing research initiatives</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewMode('new-project')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(stats?.recentProjects && stats.recentProjects.length > 0) ? (
                <div className="space-y-4">
                  {stats.recentProjects.map((project) => (
                    <ResearchProjectCard
                      key={project.id}
                      project={project}
                      compact
                      onRun={handleRunResearch}
                      onView={handleViewProject}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No projects yet</p>
                  <p className="text-sm mt-1">Create your first research project to get started</p>
                  <Button 
                    size="sm" 
                    className="mt-4"
                    onClick={() => setViewMode('new-project')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Insights */}
          <div className="lg:col-span-3">
            <IntelligenceFeed
              items={stats?.recentInsights || []}
              maxItems={5}
              loading={loading}
            />
          </div>
        </div>

        {/* Analytics Section */}
        {(stats?.projectsByDay?.length || 0) > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Projects Over Time Chart */}
            <AnalyticsCharts
              title="Projects Created (Last 30 Days)"
              timeSeriesData={(stats?.projectsByDay || []).map(p => ({
                date: p.date,
                value: p.count
              })).reverse()}
              chartType="area"
              height={220}
              valueFormatter={(v) => `${v} projects`}
            />

            {/* Analysis Types Distribution */}
            <AnalyticsCharts
              title="Analysis Breakdown"
              categoryData={(stats?.analysesByType || []).map(a => ({
                name: a.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: a.count
              }))}
              chartType="bar"
              height={220}
            />
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common research tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col space-y-2">
                <Search className="h-6 w-6" />
                <span>New Competitor Analysis</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span>Trend Detection</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col space-y-2">
                <Target className="h-6 w-6" />
                <span>Pricing Analysis</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col space-y-2">
                <Users className="h-6 w-6" />
                <span>Sentiment Analysis</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-6 bg-gray-50">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>Market Research Agent • AI-Powered Competitive Intelligence Platform</p>
          <p className="mt-1 text-xs">
            Built with Next.js • PostgreSQL • OpenAI Integration
          </p>
        </div>
      </footer>
    </div>
  )
}
