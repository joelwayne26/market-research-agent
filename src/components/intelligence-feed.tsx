/**
 * Intelligence Feed Component
 * 
 * Displays a live feed of market intelligence insights.
 * Features:
 * - Real-time style updates
 * - Type-based color coding
 * - Impact scoring visualization
 * - Filtering by type
 * 
 * @component IntelligenceFeed
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  DollarSign,
  ArrowRightLeft,
  Clock,
  Filter,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Eye
} from 'lucide-react'

/**
 * Insight type configuration
 */
const INSIGHT_TYPE_CONFIG: Record<string, {
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
}> = {
  trend: {
    label: 'Trend',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  opportunity: {
    label: 'Opportunity',
    icon: Lightbulb,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200'
  },
  threat: {
    label: 'Threat',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200'
  },
  competitive_move: {
    label: 'Competitive Move',
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200'
  },
  customer_need: {
    label: 'Customer Need',
    icon: Users,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200'
  },
  price_change: {
    label: 'Price Change',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200'
  },
  market_shift: {
    label: 'Market Shift',
    icon: ArrowRightLeft,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200'
  }
}

/**
 * Intelligence item interface
 */
export interface IntelligenceItem {
  id: string
  project_id?: string
  insight_type: string
  title: string
  description?: string | null
  impact_score?: number | null
  confidence_level?: number | null
  detected_at: string
  status?: string
  // Optional joined fields
  project_name?: string
}

interface IntelligenceFeedProps {
  items: IntelligenceItem[]
  maxItems?: number
  showFilters?: boolean
  onViewInsight?: (id: string) => void
  onActOnInsight?: (id: string) => void
  loading?: boolean
}

/**
 * Renders a feed of market intelligence items
 */
export function IntelligenceFeed({
  items,
  maxItems = 10,
  showFilters = true,
  onViewInsight,
  onActOnInsight,
  loading = false
}: IntelligenceFeedProps) {
  const [filterType, setFilterType] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /**
   * Filters items by selected type
   */
  const filteredItems = filterType === 'all' 
    ? items 
    : items.filter(item => item.insight_type === filterType)

  /**
   * Limits displayed items
   */
  const displayItems = filteredItems.slice(0, maxItems)

  /**
   * Gets unique insight types for filter options
   */
  const insightTypes = [...new Set(items.map(item => item.insight_type))]

  /**
   * Formats relative time
   */
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  /**
   * Renders impact score bar
   */
  const ImpactScoreBar = ({ score }: { score: number }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            score >= 8 ? 'bg-green-500' :
            score >= 6 ? 'bg-yellow-500' :
            score >= 4 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-6 text-right">
        {score}
      </span>
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Market Intelligence
            <Badge variant="secondary" className="ml-2">
              {items.length}
            </Badge>
          </CardTitle>
          
          {/* Refresh button could go here */}
        </div>

        {/* Type Filters */}
        {showFilters && insightTypes.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <Button
              size="sm"
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
              className="h-7 text-xs"
            >
              All
            </Button>
            {insightTypes.map(type => {
              const config = INSIGHT_TYPE_CONFIG[type]
              if (!config) return null
              
              return (
                <Button
                  key={type}
                  size="sm"
                  variant={filterType === type ? 'default' : 'outline'}
                  onClick={() => setFilterType(type)}
                  className="h-7 text-xs"
                >
                  <config.icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Button>
              )
            })}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No insights found</p>
            <p className="text-sm mt-1">
              {filterType !== 'all' 
                ? `No ${filterType.replace('_', ' ')} insights available`
                : 'Run research to generate insights'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {displayItems.map(item => {
              const config = INSIGHT_TYPE_CONFIG[item.insight_type] || INSIGHT_TYPE_CONFIG.trend
              const IconComponent = config.icon
              const isExpanded = expandedId === item.id

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-3 transition-all cursor-pointer hover:shadow-sm ${config.bgColor}`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className={`p-2 rounded-lg ${config.color} bg-white/50 shrink-0`}>
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight line-clamp-2">
                          {item.title}
                        </p>
                        <ChevronDown 
                          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        />
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs h-5">
                          {config.label}
                        </Badge>
                        
                        {item.impact_score !== null && item.impact_score !== undefined && (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">Impact:</span>
                            <ImpactScoreBar score={item.impact_score} />
                          </div>
                        )}

                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(item.detected_at)}
                        </span>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && item.description && (
                        <div className="mt-3 pt-3 border-t border-current/10">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {item.description}
                          </p>
                          
                          {item.confidence_level !== null && item.confidence_level !== undefined && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              Confidence: {Math.round(item.confidence_level * 100)}%
                            </div>
                          )}

                          {/* Action buttons when expanded */}
                          <div className="flex gap-2 mt-3">
                            {onViewInsight && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onViewInsight(item.id)
                                }}
                              >
                                View Details
                              </Button>
                            )}
                            {onActOnInsight && item.status === 'new' && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onActOnInsight(item.id)
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Act On This
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Show more indicator */}
        {filteredItems.length > maxItems && (
          <div className="text-center pt-3 border-t mt-3">
            <Button variant="ghost" size="sm" className="text-xs">
              View all {filteredItems.length} insights
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Export for use
export default IntelligenceFeed
