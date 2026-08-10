/**
 * Website Scraper
 * 
 * Specialized scraper for extracting content from websites.
 * Handles:
 * - HTML parsing and text extraction
 * - Metadata extraction (title, description, author)
 * - Link discovery for recursive scraping
 * - JavaScript-rendered page handling (optional)
 * 
 * @module lib/scrapers/web
 */

import { BaseScraper, ScrapeResult, ScrapeData, ScraperConfig, ProgressCallback } from './base'

/**
 * Web scraper specific configuration
 */
export interface WebScraperConfig extends ScraperConfig {
  extractLinks?: boolean
  maxDepth?: number
  followExternalLinks?: boolean
  allowedDomains?: string[]
  excludePatterns?: RegExp[]
}

/**
 * Parsed website data with additional web-specific fields
 */
export interface WebScrapeData extends ScrapeData {
  links: string[]
  metaDescription?: string
  metaKeywords?: string[]
  ogImage?: string
  wordCount: number
}

/**
 * Website Scraper class
 * Extends BaseScraper with web-specific functionality
 */
export class WebScraper extends BaseScraper {
  private webConfig: Required<WebScraperConfig>

  constructor(config: WebScraperConfig = {}) {
    super(config)
    
    this.webConfig = {
      ...this.config,
      extractLinks: config.extractLinks ?? true,
      maxDepth: config.maxDepth || 1,
      followExternalLinks: config.followExternalLinks ?? false,
      allowedDomains: config.allowedDomains || [],
      excludePatterns: config.excludePatterns || [
        /\.(pdf|jpg|jpeg|png|gif|svg|ico)$/i,
        /\/api\//i,
        /\/admin\//i
      ]
    }
  }

  /**
   * Returns source type identifier for database
   */
  getSourceType(): string {
    return 'website'
  }

  /**
   * Scrapes a single URL and extracts structured data
   * 
   * @param url - URL to scrape
   * @param options - Optional scraping options
   * @returns Structured scrape result
   * 
   * @example
   * const scraper = new WebScraper()
   * const result = await scraper.scrape('https://example.com')
   * if (result.success) {
   *   console.log(result.data?.title)
   *   console.log(result.data?.content)
   * }
   */
  async scrape(url: string, options?: Record<string, unknown>): Promise<ScrapeResult> {
    const startTime = Date.now()

    try {
      // Validate URL format
      const validatedUrl = this.validateUrl(url)
      if (!validatedUrl) {
        return {
          success: false,
          url,
          error: 'Invalid URL format'
        }
      }

      // Check if URL should be excluded
      if (this.shouldExclude(validatedUrl)) {
        return {
          success: false,
          url,
          error: 'URL matches exclusion pattern',
          metadata: { responseTimeMs: Date.now() - startTime, retries: 0 }
        }
      }

      // Make HTTP request with retry logic
      const response = await this.executeWithRetry(async () => {
        return this.makeRequest(validatedUrl)
      })

      if (!response.ok) {
        return {
          success: false,
          url: validatedUrl,
          error: `HTTP ${response.status}: ${response.statusText}`,
          metadata: { 
            responseTimeMs: Date.now() - startTime, 
            statusCode: response.status,
            retries: 0 
          }
        }
      }

      // Get response body
      const html = await response.text()

      // Extract structured data
      const data = this.parseHtml(html, validatedUrl)

      return {
        success: true,
        url: validatedUrl,
        data,
        metadata: {
          responseTimeMs: Date.now() - startTime,
          statusCode: response.status,
          retries: 0
        }
      }
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : String(error),
        metadata: { responseTimeMs: Date.now() - startTime, retries: 0 }
      }
    }
  }

  /**
   * Scrapes a website recursively up to maxDepth
   * 
   * @param startUrl - Starting URL
   * @param onProgress - Progress callback
   * @returns Array of all scraped results
   */
  async scrapeRecursive(
    startUrl: string,
    onProgress?: ProgressCallback
  ): Promise<ScrapeResult[]> {
    const visitedUrls = new Set<string>()
    const allResults: ScrapeResult[] = []
    const queue: Array<{ url: string; depth: number }> = [
      { url: startUrl, depth: 0 }
    ]

    while (queue.length > 0) {
      const { url, depth } = queue.shift()!

      // Skip if already visited or exceeded depth
      if (visitedUrls.has(url) || depth > this.webConfig.maxDepth) {
        continue
      }

      visitedUrls.add(url)

      // Scrape current URL
      const result = await this.scrape(url)
      allResults.push(result)

      // Report progress
      if (onProgress) {
        onProgress(
          (visitedUrls.size / (visitedUrls.size + queue.length)) * 100,
          `Scraped ${visitedUrls.size} pages`
        )
      }

      // Extract links for further crawling
      if (
        result.success && 
        result.data && 
        depth < this.webConfig.maxDepth &&
        this.webConfig.extractLinks
      ) {
        const webData = result.data as WebScrapeData
        const newLinks = this.filterLinks(webData.links, url)

        for (const link of newLinks) {
          if (!visitedUrls.has(link)) {
            queue.push({ url: link, depth: depth + 1 })
          }
        }
      }

      // Rate limiting
      await this.delay(this.config.delayBetweenRequests)
    }

    return allResults
  }

  /**
   * Parses HTML and extracts structured data
   */
  private parseHtml(html: string, url: string): WebScrapeData {
    // Extract title
    const title = this.extractTitleFromHtml(html)

    // Extract main text content
    const content = this.extractTextFromHtml(html)

    // Extract meta tags
    const metaDescription = this.extractMetaTag(html, 'description')
    const metaKeywords = this.extractMetaTag(html, 'keywords')?.split(',').map(k => k.trim())
    const ogImage = this.extractOgProperty(html, 'image')

    // Extract links
    const links = this.webConfig.extractLinks ? this.extractLinks(html, url) : []

    return {
      title,
      content,
      contentType: 'html',
      sourceUrl: url,
      extractedAt: new Date(),
      links,
      metaDescription,
      metaKeywords,
      ogImage,
      wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
      metadata: {
        metaDescription,
        metaKeywords,
        ogImage,
        wordCount: content.split(/\s+/).length
      }
    }
  }

  /**
   * Validates and normalizes URL
   */
  private validateUrl(url: string): string | null {
    try {
      let normalizedUrl = url.trim()
      
      // Add protocol if missing
      if (!normalizedUrl.match(/^https?:\/\//i)) {
        normalizedUrl = 'https://' + normalizedUrl
      }

      const parsed = new URL(normalizedUrl)
      
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null
      }

      return parsed.toString()
    } catch {
      return null
    }
  }

  /**
   * Checks if URL should be excluded based on patterns
   */
  private shouldExclude(url: string): boolean {
    return this.webConfig.excludePatterns.some(pattern => pattern.test(url))
  }

  /**
   * Extracts links from HTML content
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = []
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
    
    let match
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1]
      
      // Skip anchors, javascript, mailto
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        continue
      }

      // Resolve relative URLs
      const absoluteUrl = this.resolveUrl(href, baseUrl)
      
      if (absoluteUrl) {
        links.push(absoluteUrl)
      }
    }

    return [...new Set(links)] // Deduplicate
  }

  /**
   * Resolves relative URLs to absolute
   */
  private resolveUrl(href: string, base: string): string | null {
    try {
      if (href.match(/^https?:\/\//i)) {
        return new URL(href).toString()
      }
      
      return new URL(href, base).toString()
    } catch {
      return null
    }
  }

  /**
   * Filters links based on configuration
   */
  private filterLinks(links: string[], currentUrl: string): string[] {
    const currentDomain = new URL(currentUrl).hostname

    return links.filter(link => {
      try {
        const linkUrl = new URL(link)
        
        // Check domain restrictions
        if (!this.webConfig.followExternalLinks && linkUrl.hostname !== currentDomain) {
          return false
        }

        // Check allowed domains list
        if (this.webConfig.allowedDomains.length > 0) {
          return this.webConfig.allowedDomains.some(domain => 
            linkUrl.hostname === domain || linkUrl.hostname.endsWith('.' + domain)
          )
        }

        // Check exclusion patterns
        return !this.shouldExclude(link)
      } catch {
        return false
      }
    })
  }

  /**
   * Extracts a specific meta tag content
   */
  private extractMetaTag(html: string, name: string): string | undefined {
    const regex = new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`,
      'i'
    )
    const match = html.match(regex)
    return match?.[1]
  }

  /**
   * Extracts Open Graph property
   */
  private extractOgProperty(html: string, property: string): string | undefined {
    const regex = new RegExp(
      `<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']*)["']`,
      'i'
    )
    const match = html.match(regex)
    return match?.[1]
  }

  /**
   * Quick scrape - only gets essential data without full parsing
   * Useful for checking if page exists or getting just the title
   */
  async quickScrape(url: string): Promise<{ title?: string; exists: boolean }> {
    try {
      const result = await this.scrape(url)
      return {
        title: result.data?.title,
        exists: result.success
      }
    } catch {
      return { exists: false }
    }
  }
}

// Export singleton instance for convenience
export default WebScraper
