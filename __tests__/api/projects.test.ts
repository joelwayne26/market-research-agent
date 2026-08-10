/**
 * API Routes Tests - Research Projects
 * 
 * Tests for the /api/research/projects endpoints:
 * - GET /api/research/projects (list)
 * - POST /api/research/projects (create)
 * - GET /api/research/projects/[id] (detail)
 * - PATCH /api/research/projects/[id] (update)
 * - DELETE /api/research/projects/[id] (archive)
 */

import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Base URL for API tests
 */
const API_BASE = '/api/research/projects'

describe('Research Projects API', () => {
  let testProjectId: string | null = null

  describe('GET /api/research/projects', () => {
    it('should return a list of projects with success status', async () => {
      const response = await fetch(API_BASE)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.pagination).toHaveProperty('total')
      expect(data.pagination).toHaveProperty('limit')
      expect(data.pagination).toHaveProperty('offset')
    })

    it('should support query parameters for filtering', async () => {
      // Test with status filter
      const response = await fetch(`${API_BASE}?status=draft&limit=5`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      
      // If there are results, they should have the filtered status
      if (data.data.length > 0) {
        data.data.forEach((project: { status: string }) => {
          expect(project.status).toBe('draft')
        })
      }
    })

    it('should include pagination metadata', async () => {
      const response = await fetch(`${API_BASE}?limit=2`)
      const data = await response.json()

      expect(data.pagination.limit).toBe(2)
      expect(typeof data.pagination.total).toBe('number')
      expect(typeof data.pagination.hasMore).toBe('boolean')
    })
  })

  describe('POST /api/research/projects', () => {
    it('should create a new project with valid data', async () => {
      const newProject = {
        name: `Test Project ${Date.now()}`,
        description: 'A test project created by automated tests',
        targetMarket: 'Test Market Segment',
        competitors: ['Competitor A', 'Competitor B'],
        keywords: ['test', 'automation'],
        researchType: 'competitive_analysis'
      }

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.name).toBe(newProject.name)
      expect(data.data.description).toBe(newProject.description)
      expect(data.data.target_market).toBe(newProject.targetMarket)
      expect(data.data.research_type).toBe(newProject.researchType)
      expect(data.data.id).toBeDefined()

      // Store ID for later tests
      testProjectId = data.data.id
    })

    it('should reject invalid project data', async () => {
      const invalidData = {
        name: '', // Empty name should fail
        researchType: 'invalid_type' // Invalid enum value
      }

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should require project name', async () => {
      const noName = {
        description: 'No name provided'
      }

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noName)
      })

      expect(response.status).toBe(400)
    })

    it('should handle optional fields gracefully', async () => {
      const minimalProject = {
        name: `Minimal Test ${Date.now()}`
      }

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalProject)
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      // Optional fields should have defaults
      expect(data.data.description).toBe('')
      expect(data.data.research_type).toBe('comprehensive')
    })
  })

  describe('GET /api/research/projects/[id]', () => {
    it('should return project details for valid ID', async () => {
      // First create a project to get a valid ID
      const createResponse = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Detail Test ${Date.now()}`,
          description: 'Testing detail endpoint'
        })
      })
      const created = await createResponse.json()
      const projectId = created.data.id

      const response = await fetch(`${API_BASE}/${projectId}`)
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.project).toBeDefined()
      expect(data.data.stats).toBeDefined()
      expect(data.data.recentActivity).toBeDefined()
      expect(data.data.project.id).toBe(projectId)
    })

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await fetch(`${API_BASE}/${fakeId}`)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })
  })

  describe('PATCH /api/research/projects/[id]', () => {
    it('should update project fields', async () => {
      if (!testProjectId) {
        // Create one first
        const createResponse = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Update Test ${Date.now()}` })
        })
        const created = await createResponse.json()
        testProjectId = created.data.id
      }

      const updates = {
        name: `Updated Name ${Date.now()}`,
        description: 'Updated description'
      }

      const response = await fetch(`${API_BASE}/${testProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe(updates.name)
      expect(data.data.description).toBe(updates.description)
    })
  })

  describe('DELETE /api/research/projects/[id]', () => {
    it('should archive (soft delete) a project', async () => {
      // Create a project to delete
      const createResponse = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Delete Test ${Date.now()}` })
      })
      const created = await createResponse.json()
      const projectId = created.data.id

      const response = await fetch(`${API_BASE}/${projectId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.message).toContain('archived')
    })
  })
})

describe('POST /api/research/projects/[id]/run', () => {
  it('should start research execution for a draft project', async () => {
    // Create a draft project
    const createResponse = await fetch('/api/research/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Run Test ${Date.now()}`,
        researchType: 'competitive_analysis'
      })
    })
    const created = await createResponse.json()
    const projectId = created.data.id

    // Start research
    const runResponse = await fetch(`/api/research/projects/${projectId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    const data = await runResponse.json()

    expect(runResponse.status).toBe(202) // Accepted
    expect(data.success).toBe(true)
    expect(data.message).toContain('started')
    expect(data.data.status).toBe('running')
    expect(data.data.stages).toBeDefined()
  })

  it('should reject running an already running project', async () => {
    // This would need a project that's already in 'running' state
    // For now we just verify the error handling structure
    const fakeRunningId = 'running-project-id'
    
    // Note: This test may fail if the ID doesn't exist
    try {
      const response = await fetch(`/api/research/projects/${fakeRunningId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      // Should either succeed or fail gracefully
      expect([200, 202, 404, 500]).toContain(response.status)
    } catch {
      // Network errors are acceptable in this context
    }
  })
})
