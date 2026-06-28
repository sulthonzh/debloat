import { DetectionResult } from '../../types/analysis.js'
import { DependencyIssue, DependencySuggestion } from '../../types/dependency-issues.js'
import { AnalysisConfig } from '../../types/analysis.js'

// Functional categorization of npm packages
const FUNCTIONAL_CATEGORIES = {
  'state-management': [
    'zustand', 'recoil', 'jotai', 'mobx', 'vuex', 'redux', 'immer', 'xstate'
  ],
  'http-client': [
    'axios', 'node-fetch', 'ky', 'undici', 'superagent', 'got', 'fetch-blob'
  ],
  'date-time': [
    'moment', 'date-fns', 'dayjs', 'luxon', 'date-format', 'moment-timezone'
  ],
  'utility': [
    'lodash', 'ramda', 'underscore', 'util-deprecate', 'inherits'
  ],
  'validation': [
    'joi', 'yup', 'zod', 'ajv', 'validator.js', 'class-validator'
  ],
  'logging': [
    'winston', 'pino', 'bunyan', 'log4js', 'debug', 'clsx'
  ],
  'testing': [
    'jest', 'mocha', 'chai', 'sinon', 'vitest', 'cypress', 'playwright'
  ],
  'ui-framework': [
    'react', 'vue', 'svelte', 'angular', 'lit', 'preact', 'solid'
  ],
  'css-framework': [
    'tailwindcss', 'bootstrap', 'bulma', 'foundation', 'material-ui', 'chakra-ui'
  ],
  'animation': [
    'framer-motion', 'gsap', 'animejs', 'react-spring', 'velocity-react'
  ],
  'form-handling': [
    'react-hook-form', 'formik', 'redux-form', 'final-form', 'rff'
  ],
  'data-fetching': [
    'swr', 'react-query', 'apollo-client', 'urql', 'react-fetch-hook'
  ],
  'caching': [
    'lru-cache', 'cache-manager', 'memory-cache', 'node-cache'
  ],
  'file-handling': [
    'mime-types', 'file-type', 'archiver', 'unzipper', 'adm-zip'
  ],
  'json': [
    'json5', 'json-bigint', 'json-stable-stringify', 'flatted'
  ]
}

export async function detectFunctionalOverlap(
  dependencies: Record<string, string>,
  _config: AnalysisConfig
): Promise<DetectionResult> {
  const issues: DependencyIssue[] = []
  const suggestions: DependencySuggestion[] = []

  // Group dependencies by functional category
  const categories: Record<string, string[]> = {}

  Object.entries(dependencies).forEach(([pkg, version]) => {
    for (const [category, packages] of Object.entries(FUNCTIONAL_CATEGORIES)) {
      if (packages.includes(pkg)) {
        if (!categories[category]) {
          categories[category] = []
        }
        categories[category].push(`${pkg}@${version}`)
        break
      }
    }
  })

  // Check each category for overlaps
  Object.entries(categories).forEach(([category, packages]) => {
    if (packages.length > 1) {
      // Found functional overlap
      const issue: DependencyIssue = {
        type: 'functional-overlap',
        package: category,
        severity: {
          level: 'medium',
          score: Math.min(8, packages.length * 2)
        },
        description: `Multiple packages provide ${category.replace('-', ' ')} functionality`,
        evidence: {
          packages,
          reason: 'Detected multiple packages serving the same purpose'
        },
        impact: {
          size: estimateSizeOverlap(packages),
          security: true,
          maintenance: true,
          performance: true
        },
        category: 'dependencies'
      }

      issues.push(issue)

      // Generate suggestions
      const primaryPackage = selectPrimaryPackage(category, packages)
      const alternatives = packages.filter(p => p !== primaryPackage)

      alternatives.forEach(altPkg => {
        const suggestion: DependencySuggestion = {
          package: altPkg,
          action: {
            type: 'replace',
            package: altPkg,
            reason: `Remove redundant ${category.replace('-', ' ')} package`,
            confidence: 0.8,
            commands: [`npm uninstall ${altPkg}`]
          },
          benefits: [
            'Reduce bundle size',
            'Lower security attack surface',
            'Simplify dependency tree',
            'Reduce maintenance burden'
          ],
          risks: [
            'Code may reference the removed package',
            'Build may break if package is imported',
            'Testing may need updates'
          ],
          estimatedImpact: {
            size: estimatePackageSize(altPkg),
            security: true,
            maintenance: true,
            performance: true
          }
        }

        suggestions.push(suggestion)
      })
    }
  })

  return { issues, suggestions }
}

function selectPrimaryPackage(category: string, packages: string[]): string {
  // Priority rules for selecting primary package
  const priorities = {
    'state-management': ['zustand', 'recoil', 'jotai', 'mobx', 'redux'],
    'http-client': ['axios', 'node-fetch', 'ky', 'undici'],
    'date-time': ['date-fns', 'dayjs', 'moment', 'luxon'],
    'utility': ['lodash', 'ramda', 'underscore'],
    'validation': ['zod', 'joi', 'yup', 'ajv']
  }

  const categoryPriorities = priorities[category as keyof typeof priorities] || []
  
  // Check if any prioritized packages are in the list
  for (const priority of categoryPriorities) {
    const found = packages.find(p => p.startsWith(priority))
    if (found) return found
  }

  // Otherwise, pick the most specific (non-meta) package
  return packages.sort((a, b) => {
    // Prefer packages with specific versions
    const aHasVersion = a.includes('@')
    const bHasVersion = b.includes('@')
    if (aHasVersion && !bHasVersion) return -1
    if (!aHasVersion && bHasVersion) return 1
    
    // Prefer more specific packages (fewer general utilities)
    const aName = a.split('@')[0]
    const bName = b.split('@')[0]
    
    return bName.length - aName.length
  })[0]
}

function estimateSizeOverlap(packages: string[]): number {
  // Rough estimate based on typical package sizes
  const avgSize = 50 // KB per package
  return (packages.length - 1) * avgSize
}

function estimatePackageSize(packageName: string): number {
  // Rough size estimates based on common packages
  const sizeMap: Record<string, number> = {
    'moment': 220,
    'axios': 80,
    'lodash': 70,
    'jquery': 30,
    'express': 40,
    'react': 40,
    'vue': 30,
    'bootstrap': 150,
    'tailwindcss': 100
  }

  const pkgName = packageName.split('@')[0]
  return sizeMap[pkgName] || 50 // default 50KB
}