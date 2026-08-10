/**
 * Research Agent - LangChain-Style Implementation
 * 
 * This module implements an autonomous research agent that can:
 * - Plan and execute multi-step research tasks
 * - Use tools to gather and analyze data
 * - Make decisions based on findings
 * - Generate comprehensive reports
 * 
 * The agent follows the ReAct (Reasoning + Acting) paradigm,
 * similar to LangChain's agent architecture.
 * 
 * @module lib/agent
 */

import { chatCompletion, jsonCompletion, ChatCompletionResponse } from './openai'
import { query } from './db'

/**
 * Tool interface - defines capabilities the agent can use
 */
export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  execute: (params: Record<string, unknown>) => Promise<ToolResult>
}

/**
 * Result returned by tool execution
 */
interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Agent thought/observation structure for reasoning chain
 */
interface AgentThought {
  type: 'thought' | 'action' | 'observation' | 'final_answer'
  content: string
  timestamp: Date
  toolUsed?: string
  toolInput?: Record<string, unknown>
}

/**
 * Research task configuration
 */
export interface ResearchTaskConfig {
  projectId: string
  objective: string
  maxIterations?: number
  maxToolsPerIteration?: number
  verbose?: boolean
}

/**
 * Agent execution result
 */
export interface AgentResult {
  success: boolean
  finalAnswer: string
  reasoningChain: AgentThought[]
  toolsUsed: string[]
  iterations: number
  metadata: {
    totalProcessingTimeMs: number
    tokensEstimated: number
  }
}

/**
 * System prompt template for the research agent
 */
const AGENT_SYSTEM_PROMPT = `You are an expert Market Research AI Agent. Your role is to help users conduct thorough market research by:

1. **Planning**: Break down complex research objectives into actionable steps
2. **Gathering**: Use available tools to collect relevant data
3. **Analyzing**: Synthesize information to extract insights
4. **Reporting**: Provide clear, actionable conclusions

## Available Tools
You have access to these tools:
{tool_descriptions}

## Guidelines
- Always start by understanding the full scope of the request
- Use tools strategically - don't repeat unnecessary calls
- Synthesize information from multiple sources before concluding
- Be specific and data-driven in your responses
- If you need more information, ask clarifying questions
- Track your reasoning process explicitly

## Response Format
When using a tool, respond with:
\`\`\`json
{
  "thought": "Your reasoning here",
  "action": "tool_name",
  "input": { "param": "value" }
}
\`\`\`

When providing final answer:
\`\`\`json
{
  "thought": "Summary of findings",
  "final_answer": "Complete response to user"
}
\`\`\``

/**
 * Research Agent class
 * Implements autonomous research capabilities
 */
export class ResearchAgent {
  private tools: Map<string, AgentTool> = new Map()
  private thoughts: AgentThought[] = []
  private config: Required<ResearchTaskConfig>

  constructor(config: ResearchTaskConfig) {
    this.config = {
      ...config,
      maxIterations: config.maxIterations || 10,
      maxToolsPerIteration: config.maxToolsPerIteration || 3,
      verbose: config.verbose || false
    }

    // Register default tools
    this.registerDefaultTools()
  }

  /**
   * Registers a new tool for the agent to use
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool)
    if (this.config.verbose) {
      console.log(`[Agent] Registered tool: ${tool.name}`)
    }
  }

  /**
   * Gets all registered tools
   */
  getTools(): AgentTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Gets formatted tool descriptions for prompt
   */
  private getToolDescriptions(): string {
    return Array.from(this.tools.values())
      .map(tool => `- ${tool.name}: ${tool.description} (params: ${JSON.stringify(tool.parameters)})`)
      .join('\n')
  }

  /**
   * Adds a thought to the reasoning chain
   */
  private addThought(type: AgentThought['type'], content: string, extra?: Partial<AgentThought>): void {
    const thought: AgentThought = {
      type,
      content,
      timestamp: new Date(),
      ...extra
    }
    this.thoughts.push(thought)
    
    if (this.config.verbose) {
      console.log(`[Agent][${type.toUpperCase()}]`, content)
    }
  }

  /**
   * Executes a tool and returns result
   */
  private async executeTool(toolName: string, input: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(toolName)
    
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      }
    }

    this.addThought('action', `Using tool: ${toolName}`, { toolUsed: toolName, toolInput: input })

    try {
      const result = await tool.execute(input)
      
      this.addThought('observation', 
        result.success 
          ? `Tool ${toolName} completed successfully`
          : `Tool ${toolName} failed: ${result.error}`
      )

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.addThought('observation', `Tool ${toolName} errored: ${errorMsg}`)
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Parses agent response to determine next action
   */
  private parseResponse(response: string): {
    thought: string
    action?: string
    input?: Record<string, unknown>
    finalAnswer?: string
  } {
    // Try to extract JSON from response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim())
        return {
          thought: parsed.thought || '',
          action: parsed.action,
          input: parsed.input,
          finalAnswer: parsed.final_answer
        }
      } catch {
        // Fall through to plain text handling
      }
    }

    // Treat as final answer if no action found
    return {
      thought: response,
      finalAnswer: response
    }
  }

  /**
   * Runs the research agent autonomously
   * Main execution loop following ReAct pattern
   */
  async run(userMessage?: string): Promise<AgentResult> {
    const startTime = Date.now()
    let currentMessage = userMessage || this.config.objective
    const toolsUsed: Set<string> = new Set()

    try {
      // Initial planning phase
      this.addThought('thought', 'Starting research task analysis...')

      const systemPrompt = AGENT_SYSTEM_PROMPT.replace(
        '{tool_descriptions}',
        this.getToolDescriptions()
      )

      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Research Objective: ${this.config.objective}\n\n${currentMessage || ''}` 
        }
      ]

      // Main agent loop
      for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
        this.addThought('thought', `Iteration ${iteration + 1}/${this.config.maxIterations}`)

        // Get LLM response
        const response = await chatCompletion(messages)
        
        messages.push({ role: 'assistant', content: response.content })
        
        // Parse response
        const parsed = this.parseResponse(response.content)
        this.addThought('thought', parsed.thought)

        // Check for final answer
        if (parsed.finalAnswer) {
          this.addThought('final_answer', parsed.finalAnswer)
          break
        }

        // Execute tool if action specified
        if (parsed.action && parsed.input) {
          const result = await this.executeTool(parsed.action, parsed.input)
          toolsUsed.add(parsed.action)

          // Add observation to context
          const observationText = JSON.stringify({
            tool: parsed.action,
            success: result.success,
            data: result.data,
            error: result.error
          }, null, 2)

          messages.push({
            role: 'user',
            content: `Tool Result:\n${observationText}`
          })
        } else {
          // No action found, treat as final answer
          this.addThought('final_answer', parsed.thought)
          break
        }
      }

      // Compile final answer
      const finalAnswer = this.compileFinalAnswer()

      return {
        success: true,
        finalAnswer,
        reasoningChain: [...this.thoughts],
        toolsUsed: Array.from(toolsUsed),
        iterations: Math.min(this.thoughts.length, this.config.maxIterations),
        metadata: {
          totalProcessingTimeMs: Date.now() - startTime,
          tokensEstimated: this.estimateTotalTokens(messages)
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.addThought('final_answer', `Error during execution: ${errorMsg}`)

      return {
        success: false,
        finalAnswer: `Research failed: ${errorMsg}`,
        reasoningChain: [...this.thoughts],
        toolsUsed: Array.from(toolsUsed),
        iterations: this.thoughts.length,
        metadata: {
          totalProcessingTimeMs: Date.now() - startTime,
          tokensEstimated: 0
        }
      }
    }
  }

  /**
   * Compiles final answer from reasoning chain
   */
  private compileFinalAnswer(): string {
    const finalThoughts = this.thoughts.filter(t => t.type === 'final_answer')
    
    if (finalThoughts.length > 0) {
      return finalThoughts[finalThoughts.length - 1].content
    }

    // Fallback: summarize last few thoughts
    const recentThoughts = this.thoughts.slice(-5)
    return recentThoughts.map(t => t.content).join('\n\n')
  }

  /**
   * Estimates total tokens used in conversation
   */
  private estimateTotalTokens(
    messages: Array<{ role: string; content: string }>
  ): number {
    return messages.reduce((total, msg) => {
      return total + Math.ceil(msg.content.length / 4)
    }, 0)
  }

  /**
   * Registers built-in tools for market research
   */
  private registerDefaultTools(): void {
    // Tool: Query database for project data
    this.registerTool({
      name: 'query_project_data',
      description: 'Query data collected for the research project including raw data, analyses, and insights',
      parameters: {
        type: 'object',
        properties: {
          dataType: { 
            type: 'string', 
            enum: ['raw_data', 'analyzed_data', 'insights', 'competitors', 'all'] 
          },
          limit: { type: 'number', default: 20 },
          filters: { type: 'object' }
        },
        required: ['dataType']
      },
      execute: async (params) => {
        try {
          const dataType = params.dataType as string
          const limit = (params.limit as number) || 20

          let sql = ''
          switch (dataType) {
            case 'raw_data':
              sql = `SELECT * FROM raw_data WHERE project_id = $1 LIMIT $2`
              break
            case 'analyzed_data':
              sql = `SELECT * FROM analyzed_data WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2`
              break
            case 'insights':
              sql = `SELECT * FROM market_intelligence WHERE project_id = $1 ORDER BY impact_score DESC LIMIT $2`
              break
            case 'competitors':
              sql = `SELECT * FROM competitor_profiles WHERE project_id = $1 LIMIT $2`
              break
            default:
              sql = `
                SELECT 'project' as source, * FROM research_projects WHERE id = $1
                UNION ALL
                SELECT 'insights', * FROM market_intelligence WHERE project_id = $1 LIMIT $2
              `
          }

          const result = await query(sql, [this.config.projectId, limit])
          
          return {
            success: true,
            data: result.rows,
            metadata: { count: result.rowCount, dataType }
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      }
    })

    // Tool: Analyze specific data with AI
    this.registerTool({
      name: 'ai_analyze',
      description: 'Use AI to analyze text data and extract insights, sentiment, or patterns',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data to analyze' },
          analysisType: { 
            type: 'string', 
            enum: ['sentiment', 'summary', 'extract_entities', 'identify_trends', 'custom'] 
          },
          instructions: { type: 'string', description: 'Specific analysis instructions' }
        },
        required: ['data', 'analysisType']
      },
      execute: async (params) => {
        try {
          const data = params.data as string
          const analysisType = params.analysisType as string
          const instructions = params.instructions as string

          const prompts: Record<string, string> = {
            sentiment: 'Analyze the sentiment of this data. Return JSON with {sentiment: positive/negative/neutral, score: 0-1, key_points: []}',
            summary: 'Provide a concise summary of this data. Return JSON with {summary: "", key_findings: [], recommendations: []}',
            extract_entities: 'Extract named entities from this text. Return JSON with {entities: [{text, type, confidence}]}',
            identify_trends: 'Identify trends and patterns. Return JSON with {trends: [], patterns: [], predictions: []}',
            custom: instructions || 'Analyze this data comprehensively'
          }

          const result = await jsonCompletion([
            { role: 'system', content: 'You are a data analysis assistant. Respond only with valid JSON.' },
            { role: 'user', content: `${prompts[analysisType]}\n\nData:\n${data}` }
          ])

          return {
            success: true,
            data: result.data,
            metadata: { analysisType, tokensUsed: result.metadata.tokensUsed }
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      }
    })

    // Tool: Save insight to database
    this.registerTool({
      name: 'save_insight',
      description: 'Save a discovered insight or finding to the database',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          insightType: { 
            type: 'string', 
            enum: ['trend', 'opportunity', 'threat', 'competitive_move', 'customer_need'] 
          },
          impactScore: { type: 'number', minimum: 0, maximum: 10 },
          metrics: { type: 'object' }
        },
        required: ['title', 'description', 'insightType']
      },
      execute: async (params) => {
        try {
          await query(`
            INSERT INTO market_intelligence (
              project_id, insight_type, title, description,
              impact_score, confidence_level, metrics, status
            ) VALUES ($1, $2, $3, $4, $5, 0.8, $6, 'new')
          `, [
            this.config.projectId,
            params.insightType,
            params.title,
            params.description,
            params.impactScore || null,
            JSON.stringify(params.metrics || {})
          ])

          return {
            success: true,
            data: { message: 'Insight saved successfully' }
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }
        }
      }
    })

    // Tool: Search for additional web information
    this.registerTool({
      name: 'web_search',
      description: 'Search for additional information online (simulated for demo)',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          numResults: { type: 'number', default: 5 }
        },
        required: ['query']
      },
      execute: async (params) => {
        // Simulated search results for demo
        await new Promise(resolve => setTimeout(resolve, 500))
        
        return {
          success: true,
          data: {
            query: params.query,
            results: [
              {
                title: `Search result about "${params.query}"`,
                url: `https://example.com/search?q=${encodeURIComponent(params.query as string)}`,
                snippet: `This is simulated search result content for: ${params.query}`,
                relevance: 0.85
              }
            ],
            note: 'Simulated search results - integrate real search API for production'
          }
        }
      }
    })
  }
}

/**
 * Convenience function to create and run a research agent
 * 
 * @example
 * const result = await runResearchAgent({
 *   projectId: 'uuid',
 *   objective: 'Analyze competitor pricing strategies'
 * })
 * 
 * console.log(result.finalAnswer)
 */
export async function runResearchAgent(
  config: ResearchTaskConfig
): Promise<AgentResult> {
  const agent = new ResearchAgent(config)
  return agent.run()
}

// Export types and classes
export default ResearchAgent
