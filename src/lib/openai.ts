/**
 * OpenAI Client Configuration
 * 
 * This module provides a configured OpenAI client for AI operations.
 * It demonstrates:
 * - Proper client initialization with error handling
 * - Type-safe API interactions
 * - Retry logic for resilience
 * - Token usage tracking
 * 
 * @module lib/openai
 */

import OpenAI from 'openai'

/**
 * OpenAI configuration interface
 */
interface OpenAIConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
  timeout?: number
}

/**
 * Response interface for chat completions
 */
export interface ChatCompletionResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: string
}

/**
 * Analysis result interface
 */
export interface AnalysisResult<T = unknown> {
  success: boolean
  data: T | null
  error?: string
  metadata: {
    model: string
    processingTimeMs: number
    tokensUsed: number
  }
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  model: 'gpt-4-turbo',
  temperature: 0.3,
  maxTokens: 2000,
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
}

/**
 * Creates and configures an OpenAI client instance.
 * 
 * The client is created with sensible defaults and can be customized
 * through environment variables or explicit configuration.
 * 
 * @example
 * // Using default configuration (reads from env)
 * const openai = createOpenAIClient()
 * 
 * @example
 * // With custom configuration
 * const openai = createOpenAIClient({
 *   apiKey: 'sk-...',
 *   model: 'gpt-4',
 *   temperature: 0.5
 * })
 */
export function createOpenAIClient(config?: Partial<OpenAIConfig>): OpenAI {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.warn('OpenAI API key not provided. Set OPENAI_API_KEY environment variable.')
  }

  return new OpenAI({
    apiKey,
    timeout: config?.timeout || DEFAULT_CONFIG.timeout,
    maxRetries: DEFAULT_CONFIG.maxRetries,
  })
}

/**
 * Global singleton instance of the OpenAI client
 * Created lazily on first access
 */
let _client: OpenAI | null = null

/**
 * Gets the shared OpenAI client instance.
 * Uses singleton pattern to avoid multiple connections.
 * 
 * @returns Configured OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = createOpenAIClient()
  }
  return _client
}

/**
 * Sends a chat completion request to OpenAI.
 * 
 * This is the primary method for interacting with the LLM.
 * Includes automatic retry logic and error handling.
 * 
 * @param messages - Array of chat messages (system, user, assistant)
 * @param options - Optional configuration overrides
 * @returns Promise resolving to structured response
 * 
 * @example
 * const response = await chatCompletion([
 *   { role: 'system', content: 'You are a market research analyst.' },
 *   { role: 'user', content: 'Analyze this competitor data...' }
 * ])
 * 
 * console.log(response.content) // AI response text
 * console.log(response.usage.totalTokens) // Token count
 */
export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: Partial<OpenAIConfig>
): Promise<ChatCompletionResponse> {
  const startTime = Date.now()
  const client = getOpenAIClient()
  
  try {
    const response = await client.chat.completions.create({
      model: options?.model || DEFAULT_CONFIG.model,
      messages,
      temperature: options?.temperature || DEFAULT_CONFIG.temperature,
      max_tokens: options?.maxTokens || DEFAULT_CONFIG.maxTokens,
    })

    const choice = response.choices[0]
    
    if (!choice?.message?.content) {
      throw new Error('No content in response')
    }

    return {
      content: choice.message.content,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason || 'stop'
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error(`Failed to get completion: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    const duration = Date.now() - startTime
    console.debug(`OpenAI request completed in ${duration}ms`)
  }
}

/**
 * Sends a chat completion with JSON response parsing.
 * Ensures the response is valid JSON before returning.
 * 
 * @param messages - Chat messages
 * @param schema - Expected structure description for prompting
 * @param options - Optional configuration
 * @returns Parsed JSON response
 * 
 * @example
 * const analysis = await jsonCompletion([
 *   { role: 'system', content: 'Return valid JSON only.' },
 *   { role: 'user', content: 'Analyze sentiment' }
 * ], { sentiment: 'positive', score: 0.8 })
 */
export async function jsonCompletion<T>(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: Partial<OpenAIConfig> & { schema?: Record<string, unknown> }
): Promise<AnalysisResult<T>> {
  const startTime = Date.now()

  try {
    // Add JSON instruction if not present
    const hasJsonInstruction = messages.some(m => 
      m.content.toLowerCase().includes('json') && m.role === 'system'
    )

    const enhancedMessages = hasJsonInstruction ? messages : [
      { role: 'system' as const, content: 'You must respond with valid JSON only. No markdown or explanation.' },
      ...messages
    ]

    const response = await chatCompletion(enhancedMessages, options)

    // Parse JSON response
    let parsedData: T
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonString = jsonMatch ? jsonMatch[1] : response.content
      parsedData = JSON.parse(jsonString.trim())
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
    }

    return {
      success: true,
      data: parsedData,
      metadata: {
        model: response.model,
        processingTimeMs: Date.now() - startTime,
        tokensUsed: response.usage.totalTokens
      }
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        model: options?.model || DEFAULT_CONFIG.model,
        processingTimeMs: Date.now() - startTime,
        tokensUsed: 0
      }
    }
  }
}

/**
 * Generates embeddings for text using OpenAI's embedding model.
 * Useful for semantic search and similarity comparisons.
 * 
 * @param input - Text or array of texts to embed
 * @param model - Embedding model (default: text-embedding-3-small)
 * @returns Array of embedding vectors
 * 
 * @example
 * const embedding = await generateEmbedding('Market research is important')
 * console.log(embedding.length) // 1536 dimensions
 */
export async function generateEmbedding(
  input: string | string[],
  model: string = 'text-embedding-3-small'
): Promise<number[][]> {
  const client = getOpenAIClient()
  
  try {
    const response = await client.embeddings.create({
      model,
      input
    })

    return response.data.map(item => item.embedding)
  } catch (error) {
    console.error('Embedding generation error:', error)
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Estimates token count for a text string.
 * Approximate: ~4 characters per token for English text.
 * 
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  // Rough approximation: ~4 chars per token for English
  return Math.ceil(text.length / 4)
}

/**
 * Truncates text to fit within token limit.
 * Preserves whole words when possible.
 * 
 * @param text - Text to truncate
 * @param maxTokens - Maximum allowed tokens
 * @returns Truncated text
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedChars = maxTokens * 4
  
  if (text.length <= estimatedChars) {
    return text
  }

  // Try to find a good break point (space or punctuation)
  let truncated = text.slice(0, estimatedChars)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > estimatedChars * 0.8) {
    truncated = truncated.slice(0, lastSpace)
  }

  return truncated + '...'
}

// Export default client getter as convenience
export default getOpenAIClient
