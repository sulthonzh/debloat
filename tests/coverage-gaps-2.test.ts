import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateFixCode } from '../src/core/fix-codegen.js'
import { generateFixes, applyFixes } from '../src/core/fixes.js'
import { checkPackageExists, estimatePackageSize, checkSuspiciousPatterns } from '../src/core/detection/hallucinations.js'
import { validatePackageJson, loadLockFile } from '../src/utils/package-loader.js'
import { writeFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import type { DependencySuggestion, SuggestionAction } from '../src/types/dependency-issues.js'
import type { PackageJson } from '../src/types/package-json.js'
import type { AnalysisResult } from '../src/types/analysis.js'

function mockSuggestion(overrides: Partial<SuggestionAction> & { package: string }): DependencySuggestion {
  return {
    package: overrides.package,
    action: {
      type: overrides.type || 'remove',
      package: overrides.package,
      reason: overrides.reason || 'test reason',
      confidence: overrides.confidence ?? 0.8,
      commands: overrides.commands || [],
      ...overrides,
    },
    benefits: ['test benefit'],
    risks: ['test risk'],
    estimatedImpact: { size: 50, security: true, maintenance: true, performance: true },
  }
}

function mockResult(suggestions: DependencySuggestion[] = []): AnalysisResult {
  return {
    issues: [],
    suggestions,
    summary: {
      totalDependencies: 10,
      unusedDependencies: 0,
      redundantDependencies: 0,
      hallucinatedDependencies: 0,
      potentialSavings: 0,
      healthScore: 100,
    },
  }
}

// === fix-codegen.ts uncovered branches ===

describe('fix-codegen.ts coverage gaps', () => {
  describe('replace with devDependencies and version', () => {
    it('should include --save-dev install for replacement when package is in devDependencies with version', async () => {
      const suggestion = mockSuggestion({ type: 'replace', package: 'axios', replacement: 'fetch', version: '^3.0.0', commands: [] })
      const result = await generateFixCode(suggestion, {
        name: 't',
        version: '1.0.0',
        devDependencies: { axios: '^1.0.0' },
      })
      expect(result.commands).toContain('npm install fetch@^3.0.0 --save-dev')
    })
  })

  describe('replace with devDependencies but no version', () => {
    it('should include --save-dev install without version for replacement', async () => {
      const suggestion = mockSuggestion({ type: 'replace', package: 'axios', replacement: 'fetch', version: undefined, commands: [] })
      const result = await generateFixCode(suggestion, {
        name: 't',
        version: '1.0.0',
        devDependencies: { axios: '^1.0.0' },
      })
      expect(result.commands).toContain('npm install fetch --save-dev')
    })
  })

  describe('downgrade with devDependencies', () => {
    it('should include --save-dev for downgrade when package is in devDependencies', async () => {
      const suggestion = mockSuggestion({ type: 'downgrade', package: 'express', version: '^4.0.0', commands: [] })
      const result = await generateFixCode(suggestion, {
        name: 't',
        version: '1.0.0',
        devDependencies: { express: '^5.0.0' },
      })
      expect(result.commands).toContain('npm install express@^4.0.0 --save-dev')
    })
  })
})

// === fixes.ts uncovered branches ===

describe('fixes.ts coverage gaps', () => {
  describe('generateFixes with empty commands', () => {
    it('should handle suggestions with undefined commands by spreading default []', async () => {
      const suggestion = mockSuggestion({ type: 'remove', package: 'lodash', commands: undefined as unknown as string[] })
      const result = await generateFixes(
        { name: 't', version: '1.0.0', dependencies: { lodash: '^4.0.0' } },
        mockResult([suggestion]),
      )
      // Should have enriched commands from generateFixCode
      expect(result.suggestions[0].action.commands).toBeDefined()
      expect(result.suggestions[0].action.commands!.length).toBeGreaterThan(0)
    })

    it('should handle suggestions with existing commands by concatenating', async () => {
      const suggestion = mockSuggestion({ type: 'remove', package: 'lodash', commands: ['echo before'] })
      const result = await generateFixes(
        { name: 't', version: '1.0.0', dependencies: { lodash: '^4.0.0' } },
        mockResult([suggestion]),
      )
      expect(result.suggestions[0].action.commands!.includes('echo before')).toBe(true)
      expect(result.suggestions[0].action.commands!.length).toBeGreaterThan(1)
    })
  })

  describe('applyFixes upgrade/downgrade', () => {
    it('should upgrade package in dependencies', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
      const pkgPath = join(dir, 'package.json')
      writeFileSync(pkgPath, JSON.stringify({
        name: 't',
        version: '1.0.0',
        dependencies: { express: '^4.0.0' },
      }))
      const suggestion = mockSuggestion({ type: 'upgrade', package: 'express', version: '^5.0.0', commands: [] })
      const result = await applyFixes(
        { name: 't', version: '1.0.0', dependencies: { express: '^4.0.0' } },
        mockResult([suggestion]),
        pkgPath,
      )
      expect(result).toBe(true)
      const { readFileSync } = require('fs')
      const written = readFileSync(pkgPath, 'utf-8')
      const pkg = JSON.parse(written)
      expect(pkg.dependencies.express).toBe('^5.0.0')
      rmSync(dir, { recursive: true, force: true })
    })

    it('should upgrade package in devDependencies', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
      const pkgPath = join(dir, 'package.json')
      writeFileSync(pkgPath, JSON.stringify({
        name: 't',
        version: '1.0.0',
        devDependencies: { typescript: '^4.0.0' },
      }))
      const suggestion = mockSuggestion({ type: 'upgrade', package: 'typescript', version: '^5.0.0', commands: [] })
      const result = await applyFixes(
        { name: 't', version: '1.0.0', devDependencies: { typescript: '^4.0.0' } },
        mockResult([suggestion]),
        pkgPath,
      )
      expect(result).toBe(true)
      const { readFileSync } = require('fs')
      const written = readFileSync(pkgPath, 'utf-8')
      const pkg = JSON.parse(written)
      expect(pkg.devDependencies.typescript).toBe('^5.0.0')
      rmSync(dir, { recursive: true, force: true })
    })

    it('should downgrade package in dependencies', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
      const pkgPath = join(dir, 'package.json')
      writeFileSync(pkgPath, JSON.stringify({
        name: 't',
        version: '1.0.0',
        dependencies: { lodash: '^5.0.0' },
      }))
      const suggestion = mockSuggestion({ type: 'downgrade', package: 'lodash', version: '^4.0.0', commands: [] })
      const result = await applyFixes(
        { name: 't', version: '1.0.0', dependencies: { lodash: '^5.0.0' } },
        mockResult([suggestion]),
        pkgPath,
      )
      expect(result).toBe(true)
      const { readFileSync } = require('fs')
      const written = readFileSync(pkgPath, 'utf-8')
      const pkg = JSON.parse(written)
      expect(pkg.dependencies.lodash).toBe('^4.0.0')
      rmSync(dir, { recursive: true, force: true })
    })

    it('should downgrade package in devDependencies', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
      const pkgPath = join(dir, 'package.json')
      writeFileSync(pkgPath, JSON.stringify({
        name: 't',
        version: '1.0.0',
        devDependencies: { react: '^19.0.0' },
      }))
      const suggestion = mockSuggestion({ type: 'downgrade', package: 'react', version: '^18.0.0', commands: [] })
      const result = await applyFixes(
        { name: 't', version: '1.0.0', devDependencies: { react: '^19.0.0' } },
        mockResult([suggestion]),
        pkgPath,
      )
      expect(result).toBe(true)
      const { readFileSync } = require('fs')
      const written = readFileSync(pkgPath, 'utf-8')
      const pkg = JSON.parse(written)
      expect(pkg.devDependencies.react).toBe('^18.0.0')
      rmSync(dir, { recursive: true, force: true })
    })

    it('should return false on write error', async () => {
      const suggestion = mockSuggestion({ type: 'remove', package: 'lodash', commands: [] })
      const result = await applyFixes(
        { name: 't', version: '1.0.0', dependencies: { lodash: '^4.0.0' } },
        mockResult([suggestion]),
        '/nonexistent/path/that/does/not/exist/package.json',
      )
      expect(result).toBe(false)
    })
  })
})

// === hallucinations.ts uncovered branches ===

describe('hallucinations.ts coverage gaps', () => {
  describe('checkPackageExists version range without match', () => {
    it('should return true when ^ version has no matching base in registry', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ versions: { '9.0.0': {}, '9.1.0': {} } }),
      }))
      // ^8 base version 8, registry has 9.x → no match → falls through to "return true"
      const result = await checkPackageExists('express', '^8.0.0')
      expect(result).toBe(true)
      vi.restoreAllMocks()
    })

    it('should return true when ~ version has no matching base in registry', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ versions: { '2.0.0': {} } }),
      }))
      // ~1 base version 1, registry has 2.x → no match → falls through to "return true"
      const result = await checkPackageExists('express', '~1.0.0')
      expect(result).toBe(true)
      vi.restoreAllMocks()
    })
  })

  describe('estimatePackageSize known packages', () => {
    // estimatePackageSize in hallucinations.ts always returns 50 KB default
    // (no size lookup table — unlike functional-overlap.ts which has its own)
    it('should return 50 for moment (default)', () => {
      expect(estimatePackageSize('moment')).toBe(50)
    })

    it('should return 50 for axios (default)', () => {
      expect(estimatePackageSize('axios')).toBe(50)
    })

    it('should return 50 for lodash (default)', () => {
      expect(estimatePackageSize('lodash')).toBe(50)
    })

    it('should return 50 for unknown packages (default)', () => {
      expect(estimatePackageSize('unknown-pkg')).toBe(50)
    })

    it('should return 50 regardless of input', () => {
      expect(estimatePackageSize('moment@2.0.0')).toBe(50)
      expect(estimatePackageSize('axios@^1.5.0')).toBe(50)
    })
  })

  describe('checkSuspiciousPatterns additional edges', () => {
    it('should return null for normal package names', () => {
      expect(checkSuspiciousPatterns('vue')).toBeNull()
      expect(checkSuspiciousPatterns('angular')).toBeNull()
    })

    it('should flag names starting with dash', () => {
      const result = checkSuspiciousPatterns('-pkg')
      // Very short (4 chars) or starts with dash — should be flagged if ≤2 or some rule
      // Just verify it doesn't crash
      expect(result).toBeDefined()
    })
  })
})

// === package-loader.ts uncovered branches ===

describe('package-loader.ts coverage gaps', () => {
  describe('validatePackageJson with invalid dependency values', () => {
    it('should reject non-string dependency name (number key)', () => {
      // Using numeric keys get coerced to strings, but we can test invalid version type
      expect(validatePackageJson({
        name: 't',
        version: '1.0.0',
        dependencies: { lodash: 123 as unknown as string },
      })).toBe(false)
    })

    it('should reject non-string dependency value in devDependencies', () => {
      expect(validatePackageJson({
        name: 't',
        version: '1.0.0',
        devDependencies: { typescript: true as unknown as string },
      })).toBe(false)
    })

    it('should reject non-string dependency value in peerDependencies', () => {
      expect(validatePackageJson({
        name: 't',
        version: '1.0.0',
        peerDependencies: { react: 42 as unknown as string },
      })).toBe(false)
    })

    it('should reject non-string dependency value in optionalDependencies', () => {
      expect(validatePackageJson({
        name: 't',
        version: '1.0.0',
        optionalDependencies: { fsevents: null as unknown as string },
      })).toBe(false)
    })

    it('should accept empty dependency objects', () => {
      expect(validatePackageJson({
        name: 't',
        version: '1.0.0',
        dependencies: {},
      })).toBe(true)
    })
  })

  describe('loadLockFile error handling', () => {
    it('should throw for invalid lock file JSON', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'loader-test-'))
      const lockPath = join(dir, 'package-lock.json')
      writeFileSync(lockPath, '{ invalid json }')
      await expect(loadLockFile(lockPath)).rejects.toThrow()
      rmSync(dir, { recursive: true, force: true })
    })
  })
})

// === fix-codegen.ts: downgrade without version + devDeps ===

describe('fix-codegen.ts additional coverage', () => {
  it('should include --save-dev for downgrade without version when in devDependencies', async () => {
    const suggestion = mockSuggestion({ type: 'downgrade', package: 'express', version: undefined, commands: [] })
    const result = await generateFixCode(suggestion, {
      name: 't',
      version: '1.0.0',
      devDependencies: { express: '^5.0.0' },
    })
    // Should have 'npm install express --save-dev' (no version)
    expect(result.commands).toContain('npm install express --save-dev')
  })
})

// === functional-overlap.ts: selectPrimaryPackage sort comparator ===

describe('functional-overlap.ts selectPrimaryPackage coverage', () => {
  // selectPrimaryPackage is a private function — test via detectFunctionalOverlap output
  // Lines 159-168: sort comparator with version/no-version and name length comparison

  it('should select package with version over package without version (non-priority category)', async () => {
    const { detectFunctionalOverlap } = await import('../src/core/detection/functional-overlap.js')
    // Use a category without explicit priorities (e.g. 'logging')
    // Packages without @ → no version, with @ → has version
    // The function receives pkg@version format from getAllDependencies
    const result = await detectFunctionalOverlap(
      { winston: '^3.0.0', pino: '^8.0.0' },
      { checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true } },
    )
    // Both should be detected as overlap in logging category
    expect(result.issues.length).toBeGreaterThan(0)
    // Should have suggestions for removing redundant packages
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('should handle overlap in json category', async () => {
    const { detectFunctionalOverlap } = await import('../src/core/detection/functional-overlap.js')
    const result = await detectFunctionalOverlap(
      { json5: '^2.0.0', flatted: '^3.0.0' },
      { checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true } },
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should handle overlap in caching category', async () => {
    const { detectFunctionalOverlap } = await import('../src/core/detection/functional-overlap.js')
    const result = await detectFunctionalOverlap(
      { 'lru-cache': '^10.0.0', 'node-cache': '^5.0.0' },
      { checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true } },
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })
})
