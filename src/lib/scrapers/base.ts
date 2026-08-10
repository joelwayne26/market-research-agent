/**
 * Base Scraper Class
 * 
 * Abstract base class for all web scrapers.
 * Provides common functionality:
 * - Request handling with retry logic
 * - Rate limiting
 * - Error handling and logging
 * - Data normalization
 * 
 * Design Pattern: Template Method
 * Subclasses implement specific scraping logic while
 * the base class handles common concerns.
 * 
 * @module lib/scrapers/base
 */

import { query } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

/**
 * Scraping configuration options
 */
export interface ScraperConfig {
  maxRetries?: number
  timeout?: number
  delayBetweenRequests?: number // ms
  userAgent?: string
  respectRobotsTxt?: boolean
}

/**
 * Result of a single scrape operation
 */
export interface ScrapeResult {
  success: boolean
  url: string
  data?: ScrapeData
  error?: string
  metadata?: {
    responseTimeMs: number
    statusCode?: number
    retries: number
  }
}

/**
 * Normalized scraped data structure
 */
export interface ScrapeData {
  title?: string
  content: string
  contentType: 'text' | 'html' | 'json' | 'csv' | 'pdf_text'
  sourceUrl: string
  author?: string
  publishedAt?: Date
  metadata?: Record<string, unknown>
  extractedAt: Date
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: number, message: string) => void

/**
 * Abstract BaseScraper class
 * All specific scrapers should extend this class
 */
export abstract class BaseScraper {
  protected config: Required<ScraperConfig>
  protected stats: {
    totalScraped: number
    totalErrors: number
    totalDataPoints: number
  }

  constructor(config: ScraperConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      delayBetweenRequests: config.delayBetweenRequests || 1000,
      userAgent: config.userAgent || 'MarketResearchAgent/1.0',
      respectRobotsTxt: config.respectRobotsTxt ?? true
    }

    this.stats = {
      totalScraped: 0,
      totalErrors: 0,
      totalDataPoints: 0
    }
  }

  /**
   * Abstract method: Must be implemented by subclasses
   * Performs the actual scraping logic
   */
  abstract scrape(url: string, options?: Record<string, unknown>): Promise<ScrapeResult>

  /**
   * Abstract method: Returns the source type identifier
   */
  abstract getSourceType(): string

  /**
   * Scrapes multiple URLs in sequence (with rate limiting)
   * 
   * @param urls - Array of URLs to scrape
   * @param options - Optional scraping options
   * @param onProgress - Optional progress callback
   * @returns Array of scrape results
   */
  async scrapeBatch(
    urls: string[],
    options?: Record<string, unknown>,
    onProgress?: ProgressCallback
  ): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = []
    
    for (let i = 0; i < urls.length; i++) {
      try {
        const result = await this.scrape(urls[i], options)
        results.push(result)

        if (result.success) {
          this.stats.totalScraped++
          if (result.data) {
            this.stats.totalDataPoints++
          }
        } else {
          this.stats.totalErrors++
        }

        // Report progress
        if (onProgress) {
          const progress = ((i + 1) / urls.length) * 100
          onProgress(progress, `Processed ${i + 1}/${urls.length} sources`)
        }

        // Rate limiting delay
        if (i < urls.length - 1) {
          await this.delay(this.config.delayBetweenRequests)
        }
      } catch (error) {
        results.push({
          success: false,
          url: urls[i],
          error: error instanceof Error ? error.message : String(error)
        })
        this.stats.totalErrors++
      }
    }

    return results
  }

  /**
   * Saves scraped data to database
   * 
   * @param projectId - Project to associate data with
   * @param sourceId - Data source ID
   * @param data - Scraped data to save
   * @returns Database record ID
   */
  async saveToDatabase(
    projectId: string,
    sourceId: string,
    data: ScrapeData
  ): Promise<string> {
    const id = uuidv4()
    
    // Generate hash for deduplication
    const hash = this.generateHash(data.content)

    await query(`
      INSERT INTO raw_data (
        id, source_id, project_id, content, content_type,
        source_url, title, author, published_at, metadata, hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      id,
      sourceId,
      projectId,
      data.content,
      data.contentType,
      data.sourceUrl,
      data.title || null,
      data.author || null,
      data.publishedAt || null,
      JSON.stringify(data.metadata || {}),
      hash
    ])

    return id
  }

  /**
   * Updates data source status after scraping
   */
  async updateSourceStatus(
    sourceId: string,
    status: 'success' | 'failed' | 'skipped',
    pagesScraped: number = 1,
    dataPointsCollected: number = 1,
    errorMessage?: string
  ): Promise<void> {
    await query(`
      UPDATE data_sources 
      SET status = $2,
          last_scraped_at = NOW(),
          pages_scraped = COALESCE(pages_scraped, 0) + $3,
          data_points_collected = COALESCE(data_points_collected, 0) + $4,
          error_message = $5,
          updated_at = NOW()
      WHERE id = $1
    `, [sourceId, status, pagesScraped, dataPointsCollected, errorMessage || null])
  }

  /**
   * Makes HTTP request with retry logic
   * Override this method to use different HTTP clients
   */
  protected async makeRequest(url: string): Promise<{
    ok: boolean
    status: number
    text: () => Promise<string>
  }> {
    // Using native fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/json,text/plain,*/*',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      })

      return {
        ok: response.ok,
        status: response.status,
        text: async () => response.text()
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.config.timeout}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Executes request with automatic retry logic
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          console.log(`[Scraper] Retry ${attempt}/${maxRetries} after ${delay}ms`)
          await this.delay(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * Generates a simple hash for deduplication
   */
  protected generateHash(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0')
  }

  /**
   * Extracts main text content from HTML
   * Basic implementation - use a proper library for production
   */
  protected extractTextFromHtml(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ')
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim()
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&quot;/g, '"')
    
    return text
  }

  /**
   * Extracts title from HTML
   */
  protected extractTitleFromHtml(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    return titleMatch?.[1]?.trim()
  }

  /**
   * Utility: Creates a delay promise
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Gets current scraper statistics
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * Resets scraper statistics
   */
  resetStats(): void {
    this.stats = {
      totalScraped: 0,
      totalErrors: 0,
      totalDataPoints: 0
    }
  }
}

// Export for use by subclasses
export default BaseScraper
