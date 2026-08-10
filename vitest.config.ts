/**
 * Vitest Configuration
 * 
 * Configuration for the test runner.
 * Supports:
 * - TypeScript testing
 * - jsdom environment for component tests
 * - Path aliases matching tsconfig
 * - Coverage reporting
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Test file patterns
    include: ['__tests__/**/*.test.{ts,tsx}'],
    
    // Global test setup
    globals: true,
    
    // Environment
    environment: 'node',
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.*',
        '.next/'
      ],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50
      }
    },
    
    // Setup files
    setupFiles: [],
    
    // Timeout (ms)
    testTimeout: 10000,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
