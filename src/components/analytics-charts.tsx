/**
 * Analytics Charts Component
 * 
 * Provides data visualization for research analytics.
 * Uses Recharts library for rendering:
 * - Trend line charts
 * - Distribution bar/pie charts
 * - Comparison radar charts
 * - Timeline visualizations
 * 
 * @component AnalyticsCharts
 */

'use client'

import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Color palette for charts
 */
const CHART_COLORS = {
  primary: '#6366f1', // Indigo
  secondary: '#8b5cf6', // Purple
  success: '#10b981', // Green
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
  info: '#3b82f6', // Blue
  
  // Extended palette for multiple series
  palette: [
    '#6366f1',
    '#8b5cf6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#3b82f6',
    '#ec4899',
    '#14b8a6'
  ]
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  date: string
  value: number
  label?: string
}

/**
 * Category data point for bar/pie charts
 */
export interface CategoryDataPoint {
  name: string
  value: number
  color?: string
}

/**
 * Multi-series data point
 */
export interface MultiSeriesDataPoint {
  [key: string]: string | number
}

interface AnalyticsChartsProps {
  // Data props
  timeSeriesData?: TimeSeriesPoint[]
  categoryData?: CategoryDataPoint[]
  multiSeriesData?: MultiSeriesDataPoint[]
  
  // Display options
  title?: string
  chartType?: 'line' | 'bar' | 'area' | 'pie' | 'mixed'
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  animate?: boolean
  
  // Customization
  colors?: string[]
  xAxisLabel?: string
  yAxisLabel?: string
  valueFormatter?: (value: number) => string
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, label, formatter }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Renders analytics charts with various visualization types
 */
export function AnalyticsCharts({
  timeSeriesData = [],
  categoryData = [],
  multiSeriesData = [],
  title,
  chartType = 'line',
  height = 300,
  showGrid = true,
  showLegend = true,
  animate = true,
  colors,
  xAxisLabel,
  yAxisLabel,
  valueFormatter
}: AnalyticsChartsProps) {
  /**
   * Formats values for display
   */
  const formatValue = (value: number): string => {
    if (valueFormatter) return valueFormatter(value)
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  /**
   * Gets color at index with fallback to palette
   */
  const getColor = (index: number): string => {
    if (colors && colors[index]) return colors[index]
    return CHART_COLORS.palette[index % CHART_COLORS.palette.length]
  }

  /**
   * Renders line chart
   */
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={timeSeriesData}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip formatter={formatValue} />} />
        {showLegend && <Legend />}
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: CHART_COLORS.primary }}
          animationDuration={animate ? 500 : 0}
        />
      </LineChart>
    </ResponsiveContainer>
  )

  /**
   * Renders area chart
   */
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={timeSeriesData}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatValue} />
        <Tooltip content={<CustomTooltip formatter={formatValue} />} />
        {showLegend && <Legend />}
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.primary}
          fill="url(#colorGradient)"
          strokeWidth={2}
          animationDuration={animate ? 500 : 0}
        />
      </AreaChart>
    </ResponsiveContainer>
  )

  /**
   * Renders bar chart
   */
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={categoryData.length > 0 ? categoryData : multiSeriesData}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />}
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }} 
          axisLine={{ stroke: '#e5e7eb' }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip formatter={formatValue} />} />
        {showLegend && <Legend />}
        
        {/* Single series bar */}
        {categoryData.length > 0 && (
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            animationDuration={animate ? 500 : 0}
          >
            {categoryData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || getColor(index)} 
              />
            ))}
          </Bar>
        )}
        
        {/* Multi-series bars */}
        {multiSeriesData.length > 0 && Object.keys(multiSeriesData[0] || {})
          .filter(key => key !== 'name')
          .map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={getColor(index)}
              radius={[4, 4, 0, 0]}
              animationDuration={animate ? 500 : 0}
            />
          ))
        }
      </BarChart>
    </ResponsiveContainer>
  )

  /**
   * Renders pie/donut chart
   */
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={categoryData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          animationDuration={animate ? 500 : 0}
        >
          {categoryData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || getColor(index)} 
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [formatValue(value), 'Count']}
        />
        {showLegend && (
          <Legend 
            layout="vertical" 
            align="right" 
            verticalAlign="middle"
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  )

  /**
   * Determines which chart to render based on type and available data
   */
  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return renderLineChart()
      case 'area':
        return renderAreaChart()
      case 'bar':
        return renderBarChart()
      case 'pie':
        return renderPieChart()
      case 'mixed':
        // For mixed, default to line if time series, bar otherwise
        return timeSeriesData.length > 0 ? renderLineChart() : renderBarChart()
      default:
        return renderLineChart()
    }
  }

  /**
   * Shows placeholder when no data
   */
  const renderEmptyState = () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
      <div className="text-center">
        <p className="text-sm">No data available</p>
        <p className="text-xs mt-1">Run research to generate analytics</p>
      </div>
    </div>
  )

  const hasData = timeSeriesData.length > 0 || categoryData.length > 0 || multiSeriesData.length > 0

  return (
    <Card>
      {(title || showLegend) && (
        <CardHeader className="pb-2">
          {title && (
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          )}
        </CardHeader>
      )}
      <CardContent>
        {hasData ? renderChart() : renderEmptyState()}
      </CardContent>
    </Card>
  )
}

/**
 * Pre-configured chart presets for common use cases
 */
export const ChartPresets = {
  /**
   * Project progress over time
   */
  ProjectProgress: (data: TimeSeriesPoint[]) => (
    <AnalyticsCharts
      title="Research Progress"
      timeSeriesData={data}
      chartType="area"
      height={200}
      valueFormatter={(v) => `${v}%`}
    />
  ),

  /**
   * Insight distribution by type
   */
  InsightDistribution: (data: CategoryDataPoint[]) => (
    <AnalyticsCharts
      title="Insights by Type"
      categoryData={data}
      chartType="pie"
      height={250}
    />
  ),

  /**
   * Competitor comparison metrics
   */
  CompetitorMetrics: (data: MultiSeriesDataPoint[]) => (
    <AnalyticsCharts
      title="Competitor Metrics"
      multiSeriesData={data}
      chartType="bar"
      height={280}
    />
  ),

  /**
   * Data collection trend
   */
  DataCollectionTrend: (data: TimeSeriesPoint[]) => (
    <AnalyticsCharts
      title="Data Collection"
      timeSeriesData={data}
      chartType="line"
      height={200}
      colors={['#10b981']}
    />
  ),

  /**
   * Analysis breakdown by type
   */
  AnalysisBreakdown: (data: CategoryDataPoint[]) => (
    <AnalyticsCharts
      title="Analysis Types"
      categoryData={data}
      chartType="bar"
      height={220}
    />
  )
}

// Export for use
export default AnalyticsCharts
