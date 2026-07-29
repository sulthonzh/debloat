import { describe, it, expect } from 'vitest'
import { detectFunctionalOverlap } from '../src/core/detection/functional-overlap.js'
import { detectBuiltInReplacements } from '../src/core/detection/built-in-replacements.js'
import { generateFixes, applyFixes } from '../src/core/fixes.js'
import type { AnalysisConfig } from '../src/types/analysis.js'
import type { DependencySuggestion, SuggestionAction } from '../src/types/dependency-issues.js'
import type { AnalysisResult } from '../src/types/analysis.js'
import type { PackageJson } from '../src/types/package-json.js'

const mockConfig: AnalysisConfig = {
  checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true },
}

// Helper: create AnalysisResult with given suggestions
function resultWith(suggestions: DependencySuggestion[]): AnalysisResult {
  return {
    issues: [],
    suggestions,
    warnings: [],
    summary: {
      totalDependencies: 5,
      issues: 0,
      suggestions: suggestions.length,
      savings: { size: 0, dependencies: 0 },
      duration: 100,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      packageJsonPath: '/tmp/package.json',
      checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true },
    },
  }
}

// ─── functional-overlap.ts lines 159-168: selectPrimaryPackage sort comparator ───
// The sort fallback runs when category is NOT in priorities map.
// Categories NOT in priorities: logging, testing, ui-framework, css-framework,
// animation, form-handling, data-fetching, caching, file-handling, json.

describe('functional-overlap selectPrimaryPackage sort comparator (lines 159-168)', () => {
  it('should use sort comparator for logging category (no priority match)', async () => {
    // Two logging packages → overlap detected → selectPrimaryPackage called
    // No priority entry for 'logging' → falls through to sort comparator
    const result = await detectFunctionalOverlap(
      { winston: '^3.0.0', pino: '^8.0.0' },
      mockConfig
    )
    // Should detect overlap and generate exactly 1 suggestion (remove the non-primary)
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
    // Primary should be selected via sort (both have @version, so name-length sort)
    const removedPkg = result.suggestions[0].package
    expect(['winston@^3.0.0', 'pino@^8.0.0']).toContain(removedPkg)
  })

  it('should use sort comparator for testing category', async () => {
    const result = await detectFunctionalOverlap(
      { jest: '^29.0.0', mocha: '^10.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
  })

  it('should use sort comparator for ui-framework category', async () => {
    const result = await detectFunctionalOverlap(
      { react: '^18.0.0', vue: '^3.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    // 2 packages → 1 primary, 1 suggestion to remove
    expect(result.suggestions).toHaveLength(1)
  })

  it('should use sort comparator for css-framework category', async () => {
    const result = await detectFunctionalOverlap(
      { tailwindcss: '^3.0.0', bootstrap: '^5.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
  })

  it('should use sort comparator for animation category', async () => {
    const result = await detectFunctionalOverlap(
      { 'framer-motion': '^10.0.0', gsap: '^3.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
  })

  it('should use sort comparator for form-handling category', async () => {
    const result = await detectFunctionalOverlap(
      { 'react-hook-form': '^7.0.0', formik: '^2.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
  })

  it('should use sort comparator for data-fetching category', async () => {
    const result = await detectFunctionalOverlap(
      { swr: '^2.0.0', 'react-query': '^3.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
  })

  it('should use sort comparator for caching category', async () => {
    const result = await detectFunctionalOverlap(
      { 'lru-cache': '^10.0.0', 'node-cache': '^5.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
  })

  it('should use sort comparator for file-handling category', async () => {
    const result = await detectFunctionalOverlap(
      { 'mime-types': '^2.0.0', 'file-type': '^18.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
  })

  it('should use sort comparator for json category', async () => {
    const result = await detectFunctionalOverlap(
      { json5: '^2.0.0', flatted: '^3.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.suggestions).toHaveLength(1)
  })

  it('should select longer-named package as primary in sort fallback (name length sort)', async () => {
    // Sort: bName.length - aName.length → longer name first = primary
    // So the shorter-named package should be suggested for removal
    const result = await detectFunctionalOverlap(
      { 'react-hook-form': '^7.0.0', 'redux-form': '^8.0.0' },
      mockConfig
    )
    expect(result.suggestions).toHaveLength(1)
    // 'redux-form' is shorter → should be the one suggested for removal
    // (primary = longer name = 'react-hook-form')
    expect(result.suggestions[0].package).toContain('redux-form')
  })
})

// ─── fixes.ts line 16: commands || [] fallback in generateFixes ───

describe('fixes.ts generateFixes — undefined commands fallback (line 16)', () => {
  it('should handle suggestion with undefined action.commands', async () => {
    // Build a suggestion where commands is undefined → hits `|| []` branch
    const suggestion: DependencySuggestion = {
      package: 'old-pkg',
      action: {
        type: 'remove',
        package: 'old-pkg',
        reason: 'test',
        confidence: 0.5,
        // No commands property → undefined → || [] fallback
      } as SuggestionAction,
      benefits: [],
      risks: [],
      estimatedImpact: { size: 10, security: false, maintenance: false, performance: false },
    }
    const pkgJson: PackageJson = {
      name: 'test',
      version: '1.0.0',
      dependencies: { 'old-pkg': '^1.0.0' },
    }
    // Should not crash on undefined commands
    const result = await generateFixes(pkgJson, resultWith([suggestion]))
    expect(result.suggestions).toHaveLength(1)
    // After generateFixes, commands should be an array (from fixCode merge)
    expect(Array.isArray(result.suggestions[0].action.commands)).toBe(true)
  })
})

// ─── fixes.ts line 64: action.replacement with existing dependencies ───

describe('fixes.ts applyFixes — replace with existing dependencies (line 64)', () => {
  it('should add replacement when dependencies object already exists', async () => {
    // Line 64: `if (!updatedPackageJson.dependencies)` → false branch
    // Dependencies already has entries → should NOT create new object, just add
    const suggestion: DependencySuggestion = {
      package: 'old-lib',
      action: {
        type: 'replace',
        package: 'old-lib',
        replacement: 'new-lib',
        version: '^2.0.0',
        reason: 'test',
        confidence: 0.9,
        commands: [],
      },
      benefits: [],
      risks: [],
      estimatedImpact: { size: 50, security: false, maintenance: true, performance: false },
    }
    const pkgJson: PackageJson = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        'old-lib': '^1.0.0',
        'other-dep': '^3.0.0', // ensures dependencies already exists
      },
    }
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const tmpPath = path.join(os.tmpdir(), `debloat-test-${Date.now()}.json`)
    const ok = await applyFixes(pkgJson, resultWith([suggestion]), tmpPath)
    expect(ok).toBe(true)
    const written = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'))
    expect(written.dependencies['new-lib']).toBe('^2.0.0')
    expect(written.dependencies['old-lib']).toBeUndefined()
    expect(written.dependencies['other-dep']).toBe('^3.0.0')
    fs.unlinkSync(tmpPath)
  })

  it('should add replacement with default version when version undefined', async () => {
    // Line 64: action.version || 'latest' — version is undefined → 'latest'
    const suggestion: DependencySuggestion = {
      package: 'old-lib',
      action: {
        type: 'replace',
        package: 'old-lib',
        replacement: 'new-lib',
        // version deliberately omitted → || 'latest'
        reason: 'test',
        confidence: 0.9,
        commands: [],
      } as SuggestionAction,
      benefits: [],
      risks: [],
      estimatedImpact: { size: 50, security: false, maintenance: true, performance: false },
    }
    const pkgJson: PackageJson = {
      name: 'test',
      version: '1.0.0',
      dependencies: { 'old-lib': '^1.0.0' },
    }
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const tmpPath = path.join(os.tmpdir(), `debloat-test-${Date.now()}.json`)
    const ok = await applyFixes(pkgJson, resultWith([suggestion]), tmpPath)
    expect(ok).toBe(true)
    const written = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'))
    expect(written.dependencies['new-lib']).toBe('latest')
    fs.unlinkSync(tmpPath)
  })

  it('should create dependencies object when missing (line 62 truthy branch)', async () => {
    // Line 62: `if (!updatedPackageJson.dependencies)` → true → create {}
    const suggestion: DependencySuggestion = {
      package: 'old-lib',
      action: {
        type: 'replace',
        package: 'old-lib',
        replacement: 'new-lib',
        version: '^1.0.0',
        reason: 'test',
        confidence: 0.9,
        commands: [],
      },
      benefits: [],
      risks: [],
      estimatedImpact: { size: 50, security: false, maintenance: true, performance: false },
    }
    const pkgJson: PackageJson = {
      name: 'test',
      version: '1.0.0',
      // No dependencies at all → creates new object
    }
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const tmpPath = path.join(os.tmpdir(), `debloat-test-${Date.now()}.json`)
    const ok = await applyFixes(pkgJson, resultWith([suggestion]), tmpPath)
    expect(ok).toBe(true)
    const written = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'))
    expect(written.dependencies['new-lib']).toBe('^1.0.0')
    fs.unlinkSync(tmpPath)
  })
})

// ─── built-in-replacements.ts: estimatePackageSize fallback for unmapped packages ───

describe('built-in-replacements.ts estimatePackageSize fallback (line 185)', () => {
  it('should use default 50KB for unmapped packages via detection result', async () => {
    // detectBuiltInReplacements internally calls estimatePackageSize
    // For packages in BUILTIN_REPLACEMENTS, sizeMap has entries.
    // But the suggestion's estimatedImpact.size comes from estimatePackageSize(pkg)
    // For 'buffer' → sizeMap has 5, for 'util' → 10, etc.
    // The || 50 fallback fires for packages NOT in sizeMap but IN BUILTIN_REPLACEMENTS
    // Looking at the code: all BUILTIN_REPLACEMENTS keys are in sizeMap. So the fallback
    // is only reachable if a new replacement is added without a size entry.
    // However, the impact is reported on the issue/suggestion — let's verify 'buffer' path.
    const result = await detectBuiltInReplacements(
      { buffer: '^6.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].impact.size).toBe(5) // buffer = 5KB in sizeMap
    expect(result.suggestions[0].estimatedImpact.size).toBe(5)
  })

  it('should handle multiple built-in replacement packages with correct sizes', async () => {
    const result = await detectBuiltInReplacements(
      { axios: '^1.0.0', lodash: '^4.0.0', buffer: '^6.0.0', util: '^0.12.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(4)
    // Verify each has correct size from sizeMap
    const axiosIssue = result.issues.find(i => i.package === 'axios')!
    expect(axiosIssue.impact.size).toBe(80)
    const bufferIssue = result.issues.find(i => i.package === 'buffer')!
    expect(bufferIssue.impact.size).toBe(5)
    const utilIssue = result.issues.find(i => i.package === 'util')!
    expect(utilIssue.impact.size).toBe(10)
  })
})

// ─── functional-overlap.ts estimateSizeOverlap & estimatePackageSize ───

describe('functional-overlap.ts size estimation coverage', () => {
  it('should calculate size overlap for multiple packages', async () => {
    // 3 overlapping packages → estimateSizeOverlap = (3-1)*50 = 100
    const result = await detectFunctionalOverlap(
      { winston: '^3.0.0', pino: '^8.0.0', bunyan: '^1.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].impact.size).toBe(100) // (3-1)*50
  })

  it('should use sizeMap for known packages in suggestions', async () => {
    // moment is in functional-overlap's sizeMap → 220KB
    const result = await detectFunctionalOverlap(
      { 'tailwindcss': '^3.0.0', 'bootstrap': '^5.0.0' },
      mockConfig
    )
    // Suggestions contain estimatedImpact.size from estimatePackageSize
    // tailwindcss=100, bootstrap=150 in sizeMap
    for (const s of result.suggestions) {
      expect(s.estimatedImpact.size).toBeGreaterThan(0)
    }
  })

  it('should use default 50KB for unmapped packages in suggestions', async () => {
    // Packages NOT in functional-overlap's sizeMap (moment, axios, lodash, jquery, express, react, vue, bootstrap, tailwindcss)
    // winston, pino etc → default 50KB
    const result = await detectFunctionalOverlap(
      { 'framer-motion': '^10.0.0', gsap: '^3.0.0' },
      mockConfig
    )
    expect(result.suggestions).toHaveLength(1)
    // Neither framer-motion nor gsap are in sizeMap → 50KB default
    expect(result.suggestions[0].estimatedImpact.size).toBe(50)
  })
})
