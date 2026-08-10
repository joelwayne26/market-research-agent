/**
 * Research Project Card Component
 * 
 * Displays a research project with rich information including:
 * - Project name and description
 * - Status badge with color coding
 * - Progress bar with percentage
 * - Quick action buttons
 * - Key metrics summary
 * 
 * @component ResearchProjectCard
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MoreVertical,
  ExternalLink,
  BarChart3,
  FileText,
  Users
} from 'lucide-react'

/**
 * Project status configuration
 */
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Draft', variant: 'secondary', color: 'bg-gray-500' },
  running: { label: 'Running', variant: 'default', color: 'bg-blue-500' },
  completed: { label: 'Completed', variant: 'outline', color: 'bg-green-500' },
  failed: { label: 'Failed', variant: 'destructive', color: 'bg-red-500' },
  archived: { label: 'Archived', variant: 'secondary', color: 'bg-gray-400' }
}

/**
 * Research type labels
 */
const RESEARCH_TYPE_LABELS: Record<string, string> = {
  competitive_analysis: 'Competitive Analysis',
  market_trends: 'Market Trends',
  customer_sentiment: 'Customer Sentiment',
  pricing_analysis: 'Pricing Analysis',
  comprehensive: 'Comprehensive'
}

/**
 * Project data interface
 */
export interface ProjectData {
  id: string
  name: string
  description?: string | null
  target_market?: string | null
  research_type: string
  status: string
  progress: number
  total_sources_analyzed?: number
  key_findings?: unknown[]
  created_at: string
  updated_at: string
  // Optional stats from API
  stats?: {
    totalSources?: number
    totalDataPoints?: number
    totalInsights?: number
    competitorsTracked?: number
  }
}

interface ResearchProjectCardProps {
  project: ProjectData
  onRun?: (id: string) => void
  onView?: (id: string) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

/**
 * Renders a research project card with progress and actions
 */
export function ResearchProjectCard({
  project,
  onRun,
  onView,
  onDelete,
  compact = false
}: ResearchProjectCardProps) {
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft
  const typeLabel = RESEARCH_TYPE_LABELS[project.research_type] || project.research_type

  /**
   * Gets the appropriate status icon
   */
  const getStatusIcon = () => {
    switch (project.status) {
      case 'running': return <Play className="h-3 w-3" />
      case 'completed': return <CheckCircle2 className="h-3 w-3" />
      case 'failed': return <XCircle className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  /**
   * Formats date for display
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{project.name}</p>
                <Badge variant={statusConfig.variant} className="text-xs shrink-0">
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {typeLabel} • {project.target_market || 'No target specified'}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm text-muted-foreground w-12 text-right">
                {project.progress}%
              </span>
              {project.status === 'draft' && onRun && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRun(project.id)}
                  className="shrink-0"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Run
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate pr-2">
              {project.name}
            </CardTitle>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Status and Type Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant={statusConfig.variant} className="gap-1">
            {getStatusIcon()}
            {statusConfig.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {typeLabel}
          </Badge>
          {project.target_market && (
            <Badge variant="outline" className="text-xs">
              📍 {project.target_market}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                project.status === 'failed' ? 'bg-red-500' :
                project.status === 'completed' ? 'bg-green-500' :
                'bg-primary'
              }`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        {(project.stats || project.total_sources_analyzed > 0) && (
          <div className="grid grid-cols-4 gap-3 pt-2 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-semibold">
                {project.stats?.totalSources ?? project.total_sources_analyzed ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Sources</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <BarChart3 className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-semibold">
                {project.stats?.totalDataPoints ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Data Points</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-semibold">
                {project.stats?.competitorsTracked ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Competitors</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-semibold">
                {project.stats?.totalInsights ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Insights</p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            Updated {formatDate(project.updated_at)}
          </span>
          <div className="flex gap-2">
            {onView && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onView(project.id)}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                View
              </Button>
            )}
            {(project.status === 'draft' || project.status === 'failed') && onRun && (
              <Button
                size="sm"
                onClick={() => onRun(project.id)}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Run Research
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export as default for convenience
export default ResearchProjectCard
