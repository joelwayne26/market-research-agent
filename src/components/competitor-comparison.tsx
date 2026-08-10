/**
 * Competitor Comparison Component
 * 
 * Provides a side-by-side comparison view of competitors.
 * Features:
 * - Feature comparison matrix
 * - Pricing comparison table
 * - Market positioning visualization
 * - Strength/weakness highlights
 * 
 * @component CompetitorComparison
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Check,
  X,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  ExternalLink,
  Building2,
  Users as UsersIcon,
  DollarSign,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react'

/**
 * Competitor data interface for comparison
 */
export interface CompetitorComparisonData {
  id: string
  name: string
  website?: string | null
  description?: string | null
  
  // Business info
  founded_year?: number | null
  employee_count?: string | null
  revenue_estimate?: string | null
  
  // Analysis data
  strengths?: string[] | null
  weaknesses?: string[] | null
  market_positioning?: string | null
  unique_value_proposition?: string | null
  
  // Pricing
  pricing_data?: Array<{
    plan: string
    price: number | null
    period: string
  }> | null
  
  // Features (for comparison)
  features?: string[] | null
  
  // Metrics
  monthly_visits_estimate?: number | null
  alexa_rank?: number | null
}

interface CompetitorComparisonProps {
  competitors: CompetitorComparisonData[]
  featuresToCompare?: string[]
  showPricing?: boolean
  showPositioning?: boolean
  onSelectCompetitor?: (id: string) => void
}

/**
 * Renders a comprehensive competitor comparison view
 */
export function CompetitorComparison({
  competitors,
  featuresToCompare = [],
  showPricing = true,
  showPositioning = true,
  onSelectCompetitor
}: CompetitorComparisonProps) {
  const [activeTab, setActiveTab] = useState<'features' | 'pricing' | 'overview'>('overview')

  /**
   * Extracts all unique features across competitors
   */
  const allFeatures = featuresToCompare.length > 0 
    ? featuresToCompare
    : [...new Set(competitors.flatMap(c => c.features || []))]

  /**
   * Checks if a competitor has a specific feature
   */
  const hasFeature = (competitor: CompetitorComparisonData, feature: string): boolean | null => {
    if (!competitor.features) return null
    return competitor.features.some(f => 
      f.toLowerCase() === feature.toLowerCase() ||
      f.toLowerCase().includes(feature.toLowerCase()) ||
      feature.toLowerCase().includes(f.toLowerCase())
    )
  }

  /**
   * Gets pricing tier label based on price range
   */
  const getPricingTier = (competitor: CompetitorComparisonData): string => {
    if (!competitor.pricing_data || competitor.pricing_data.length === 0) return 'Unknown'
    
    const prices = competitor.pricing_data
      .map(p => p.price)
      .filter((p): p is number => p !== null)

    if (prices.length === 0) return 'Contact'
    
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    
    if (avgPrice < 50) return 'Budget'
    if (avgPrice < 200) return 'Mid-Market'
    if (avgPrice < 500) return 'Premium'
    return 'Enterprise'
  }

  /**
   * Formats large numbers for display
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (competitors.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No competitors to compare</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add competitors to your project to see comparisons
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Competitor Comparison
            <Badge variant="secondary" className="ml-2">
              {competitors.length} companies
            </Badge>
          </CardTitle>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['overview', 'features', 'pricing'] as const).map(tab => (
              <Button
                key={tab}
                size="sm"
                variant={activeTab === tab ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab)}
                className="h-7 text-xs capitalize"
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-4 md:grid-cols-{competitors.length > 2 ? Math.min(competitors.length, 4) : competitors.length}">
            {competitors.map(competitor => (
              <div
                key={competitor.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectCompetitor?.(competitor.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base">{competitor.name}</h3>
                    {competitor.market_positioning && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {competitor.market_positioning}
                      </p>
                    )}
                  </div>
                  {competitor.website && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="space-y-2 text-sm">
                  {competitor.founded_year && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Founded
                      </span>
                      <span>{competitor.founded_year}</span>
                    </div>
                  )}
                  
                  {competitor.employee_count && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <UsersIcon className="h-3 w-3" /> Employees
                      </span>
                      <span>{competitor.employee_count}</span>
                    </div>
                  )}

                  {competitor.monthly_visits_estimate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Visits/mo
                      </span>
                      <span>{formatNumber(Number(competitor.monthly_visits_estimate))}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> Tier
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getPricingTier(competitor)}
                    </Badge>
                  </div>
                </div>

                {/* Quick Strengths Preview */}
                {competitor.strengths && competitor.strengths.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" /> Strengths
                    </p>
                    <ul className="text-xs space-y-0.5">
                      {competitor.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-gray-600 truncate">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Weaknesses Preview */}
                {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                      <ArrowDownRight className="h-3 w-3" /> Weaknesses
                    </p>
                    <ul className="text-xs space-y-0.5">
                      {competitor.weaknesses.slice(0, 2).map((w, i) => (
                        <li key={i} className="text-gray-600 truncate">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Features Comparison Tab */}
        {activeTab === 'features' && allFeatures.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium min-w-[150px]">
                    Feature
                  </th>
                  {competitors.map(comp => (
                    <th key={comp.id} className="text-center py-3 px-2 font-medium min-w-[80px]">
                      {comp.name.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allFeatures.map(feature => (
                  <tr key={feature} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-600">{feature}</td>
                    {competitors.map(comp => {
                      const hasIt = hasFeature(comp, feature)
                      return (
                        <td key={comp.id} className="py-2 px-2 text-center">
                          {hasIt === true ? (
                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                          ) : hasIt === false ? (
                            <X className="h-4 w-4 text-red-400 mx-auto" />
                          ) : (
                            <Minus className="h-4 w-4 text-gray-300 mx-auto" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'features' && allFeatures.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No feature data available</p>
          </div>
        )}

        {/* Pricing Comparison Tab */}
        {activeTab === 'pricing' && showPricing && (
          <div className="space-y-4">
            {competitors.map(comp => (
              <div key={comp.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{comp.name}</h4>
                  <Badge variant="outline">{getPricingTier(comp)}</Badge>
                </div>
                
                {comp.pricing_data && comp.pricing_data.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {comp.pricing_data.map((plan, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-sm font-medium">{plan.plan}</p>
                        <p className="text-xl font-bold mt-1">
                          {plan.price !== null ? `$${plan.price}` : 'Custom'}
                        </p>
                        <p className="text-xs text-muted-foreground">{plan.period}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pricing information available
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'pricing' && !showPricing && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Pricing comparison not enabled</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Export for use
export default CompetitorComparison
