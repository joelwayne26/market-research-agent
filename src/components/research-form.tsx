/**
 * Research Form Component
 * 
 * Form for creating new research projects.
 * Features:
 * - Multi-step form wizard
 * - Real-time validation
 * - Competitor/keyword input with tags
 * - Research type selection
 * - Configuration options
 * 
 * @component ResearchForm
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Search,
  Target,
  Settings,
  FileText,
  Users,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Layers
} from 'lucide-react'

/**
 * Research type options
 */
const RESEARCH_TYPES = [
  {
    value: 'competitive_analysis',
    label: 'Competitive Analysis',
    description: 'Analyze competitors, their features, pricing, and market positioning',
    icon: Users,
    color: 'bg-purple-50 border-purple-200 text-purple-700'
  },
  {
    value: 'market_trends',
    label: 'Market Trends',
    description: 'Track emerging trends, market shifts, and industry developments',
    icon: TrendingUp,
    color: 'bg-blue-50 border-blue-200 text-blue-700'
  },
  {
    value: 'customer_sentiment',
    label: 'Customer Sentiment',
    description: 'Understand customer opinions, feedback, and satisfaction levels',
    icon: MessageSquare,
    color: 'bg-green-50 border-green-200 text-green-700'
  },
  {
    value: 'pricing_analysis',
    label: 'Pricing Analysis',
    description: 'Study pricing strategies, market rates, and optimization opportunities',
    icon: DollarSign,
    color: 'bg-amber-50 border-amber-200 text-amber-700'
  },
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    description: 'Full analysis combining all research types for complete insights',
    icon: Layers,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700'
  }
]

/**
 * Form step definitions
 */
const FORM_STEPS = [
  { id: 1, title: 'Basic Info', icon: FileText },
  { id: 2, title: 'Research Type', icon: Target },
  { id: 3, title: 'Targets', icon: Search },
  { id: 4, title: 'Configuration', icon: Settings }
]

/**
 * Form data interface
 */
export interface ResearchFormData {
  name: string
  description: string
  targetMarket: string
  researchType: string
  competitors: string[]
  keywords: string[]
  // Advanced config
  maxSources: number
  enableSentimentAnalysis: boolean
  enableTrendDetection: boolean
  enableCompetitorAnalysis: boolean
}

interface ResearchFormProps {
  onSubmit?: (data: ResearchFormData) => void
  onCancel?: () => void
  loading?: boolean
  initialData?: Partial<ResearchFormData>
}

/**
 * Renders a multi-step research project creation form
 */
export function ResearchForm({
  onSubmit,
  onCancel,
  loading = false,
  initialData
}: ResearchFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ResearchFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    targetMarket: initialData?.targetMarket || '',
    researchType: initialData?.researchType || 'comprehensive',
    competitors: initialData?.competitors || [],
    keywords: initialData?.keywords || [],
    maxSources: 30,
    enableSentimentAnalysis: true,
    enableTrendDetection: true,
    enableCompetitorAnalysis: true
  })

  const [newCompetitor, setNewCompetitor] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * Updates a single field in form data
   */
  const updateField = (field: keyof ResearchFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  /**
   * Adds a competitor to the list
   */
  const addCompetitor = () => {
    const trimmed = newCompetitor.trim()
    if (trimmed && !formData.competitors.includes(trimmed)) {
      updateField('competitors', [...formData.competitors, trimmed])
      setNewCompetitor('')
    }
  }

  /**
   * Removes a competitor from the list
   */
  const removeCompetitor = (index: number) => {
    updateField('competitors', formData.competitors.filter((_, i) => i !== index))
  }

  /**
   * Adds a keyword to the list
   */
  const addKeyword = () => {
    const trimmed = newKeyword.trim()
    if (trimmed && !formData.keywords.includes(trimmed)) {
      updateField('keywords', [...formData.keywords, trimmed])
      setNewKeyword('')
    }
  }

  /**
   * Removes a keyword from the list
   */
  const removeKeyword = (index: number) => {
    updateField('keywords', formData.keywords.filter((_, i) => i !== index))
  }

  /**
   * Validates current step
   */
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {}

    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = 'Project name is required'
        }
        break
      case 2:
        if (!formData.researchType) {
          newErrors.researchType = 'Please select a research type'
        }
        break
      case 3:
        if (formData.competitors.length === 0 && formData.keywords.length === 0) {
          newErrors.targets = 'Add at least one competitor or keyword'
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /**
   * Moves to next step
   */
  const nextStep = () => {
    if (validateStep()) {
      if (currentStep < FORM_STEPS.length) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  /**
   * Moves to previous step
   */
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  /**
   * Handles form submission
   */
  const handleSubmit = () => {
    if (validateStep() && onSubmit) {
      onSubmit(formData)
    }
  }

  /**
   * Handles Enter key in input fields
   */
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      action()
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Create Research Project</CardTitle>
        <CardDescription>
          Configure your market research project in a few simple steps
        </CardDescription>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mt-6 px-4">
          {FORM_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step.id <= currentStep 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className={`text-xs mt-2 ${
                  step.id <= currentStep ? 'text-primary font-medium' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
              
              {/* Connector Line */}
              {index < FORM_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  step.id < currentStep ? 'bg-primary' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Q4 SaaS Competitive Analysis"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  errors.name ? 'border-red-500' : 'border-gray-200'
                }`}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe what you want to achieve with this research..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Market</label>
              <input
                type="text"
                value={formData.targetMarket}
                onChange={(e) => updateField('targetMarket', e.target.value)}
                placeholder="e.g., Enterprise B2B Software, E-commerce SMB"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        {/* Step 2: Research Type */}
        {currentStep === 2 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <p className="text-sm text-muted-foreground mb-4">
              Select the primary type of research you want to perform
            </p>
            
            {RESEARCH_TYPES.map(type => {
              const IconComponent = type.icon
              const isSelected = formData.researchType === type.value

              return (
                <button
                  key={type.value}
                  onClick={() => updateField('researchType', type.value)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected ? `${type.color} border-current` : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm opacity-75 mt-0.5">{type.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 ml-auto shrink-0" />
                    )}
                  </div>
                </button>
              )
            })}
            
            {errors.researchType && (
              <p className="text-sm text-red-500">{errors.researchType}</p>
            )}
          </div>
        )}

        {/* Step 3: Targets (Competitors & Keywords) */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Competitors Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Competitors</label>
              <p className="text-xs text-muted-foreground">
                Add company names or websites to track
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCompetitor}
                  onChange={(e) => setNewCompetitor(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, addCompetitor)}
                  placeholder="Enter competitor name..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button variant="outline" onClick={addCompetitor} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.competitors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.competitors.map((comp, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 py-1">
                      {comp}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeCompetitor(idx)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Keywords Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Keywords</label>
              <p className="text-xs text-muted-foreground">
                Add topics or terms to search for
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, addKeyword)}
                  placeholder="Enter keyword..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button variant="outline" onClick={addKeyword} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.keywords.map((kw, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1 py-1">
                      {kw}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => removeKeyword(idx)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {errors.targets && (
              <p className="text-sm text-red-500">{errors.targets}</p>
            )}
          </div>
        )}

        {/* Step 4: Configuration */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Max Sources */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Maximum Data Sources: {formData.maxSources}
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={10}
                value={formData.maxSources}
                onChange={(e) => updateField('maxSources', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Faster</span>
                <span>More Comprehensive</span>
              </div>
            </div>

            {/* Analysis Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Analysis Options</label>
              
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.enableSentimentAnalysis}
                  onChange={(e) => updateField('enableSentimentAnalysis', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <div>
                  <p className="font-medium text-sm">Sentiment Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    Analyze emotional tone in collected data
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.enableTrendDetection}
                  onChange={(e) => updateField('enableTrendDetection', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <div>
                  <p className="font-medium text-sm">Trend Detection</p>
                  <p className="text-xs text-muted-foreground">
                    Identify patterns and emerging trends
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.enableCompetitorAnalysis}
                  onChange={(e) => updateField('enableCompetitorAnalysis', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <div>
                  <p className="font-medium text-sm">Competitor Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    Compare features, pricing, and positioning
                  </p>
                </div>
              </label>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-sm">Project Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {formData.name}</div>
                <div><span className="text-muted-foreground">Type:</span> {formData.researchType.replace('_', ' ')}</div>
                <div><span className="text-muted-foreground">Competitors:</span> {formData.competitors.length}</div>
                <div><span className="text-muted-foreground">Keywords:</span> {formData.keywords.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <div>
            {(currentStep > 1 || onCancel) && (
              <Button
                variant="outline"
                onClick={currentStep > 1 ? prevStep : onCancel}
              >
                {currentStep > 1 && <ArrowLeft className="h-4 w-4 mr-2" />}
                {currentStep > 1 ? 'Previous' : 'Cancel'}
              </Button>
            )}
          </div>

          <div>
            {currentStep < FORM_STEPS.length ? (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export for use
export default ResearchForm
