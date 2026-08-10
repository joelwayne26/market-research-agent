'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe, 
  Search,
  Plus,
  Activity,
  Target,
  Brain
} from 'lucide-react'

interface DashboardStats {
  totalProjects: number
  activeResearch: number
  dataPointsCollected: number
  insightsGenerated: number
  competitorsTracked: number
  recentActivity: Array<{
    id: string
    action: string
    timestamp: string
    type: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 12,
    activeResearch: 3,
    dataPointsCollected: 45820,
    insightsGenerated: 1287,
    competitorsTracked: 45,
    recentActivity: []
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Monitor your market research operations and insights
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Research</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeResearch}</div>
            <p className="text-xs text-muted-foreground">Running now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Points</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dataPointsCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.insightsGenerated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">AI-generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.competitorsTracked}</div>
            <p className="text-xs text-muted-foreground">Under monitoring</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Projects */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>Your ongoing market research initiatives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  name: 'E-commerce SaaS Competitive Analysis',
                  status: 'running',
                  progress: 67,
                  type: 'Competitive Analysis',
                  target: 'E-commerce Software',
                },
                {
                  name: 'AI Tools Market Trends 2024',
                  status: 'running',
                  progress: 34,
                  type: 'Market Trends',
                  target: 'AI Software',
                },
                {
                  name: 'FinTech Startup Landscape',
                  status: 'draft',
                  progress: 10,
                  type: 'Market Mapping',
                  target: 'Financial Technology',
                },
              ].map((project, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium leading-none">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.type} • {project.target}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={project.status === 'running' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground w-12">{project.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Insights */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Latest Insights</CardTitle>
            <CardDescription>AI-detected market opportunities and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  title: 'Growing demand for AI-powered analytics',
                  type: 'trend',
                  impact: 8.5,
                  time: '2 hours ago',
                },
                {
                  title: 'New competitor entering APAC market',
                  type: 'threat',
                  impact: 7.8,
                  time: '5 hours ago',
                },
                {
                  title: 'Price optimization opportunity in Enterprise tier',
                  type: 'opportunity',
                  impact: 9.2,
                  time: '1 day ago',
                },
                {
                  title: 'Customer preference shift to self-service tools',
                  type: 'customer_need',
                  impact: 7.1,
                  time: '2 days ago',
                },
              ].map((insight, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <div className={`mt-0.5 w-2 h-2 rounded-full ${
                    insight.type === 'trend' ? 'bg-blue-500' :
                    insight.type === 'threat' ? 'bg-red-500' :
                    insight.type === 'opportunity' ? 'bg-green-500' : 'bg-purple-500'
                  }`} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{insight.title}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs capitalize">{insight.type}</Badge>
                      <span>Impact: {insight.impact}/10</span>
                      <span>{insight.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
