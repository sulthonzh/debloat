import { describe, it, expect, afterEach } from 'vitest'
import { generateFixes, applyFixes } from '../src/core/fixes.js'
import { generateFixCode } from '../src/core/fix-codegen.js'
import type { AnalysisResult, DependencySuggestion } from '../src/types/analysis.js'
import type { PackageJson } from '../src/types/package-json.js'
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

function mockSuggestion(action: Partial<DependencySuggestion['action']> = {}): DependencySuggestion {
  return {
    package: 'axios@^1.0.0',
    action: {
      type: 'replace',
      package: 'axios',
      version: '^1.0.0',
      reason: 'Native fetch API',
      confidence: 0.9,
      commands: ['npm uninstall axios'],
      ...action,
    } as never,
    benefits: ['Zero deps'],
    risks: ['Migration effort'],
    estimatedImpact: { size: 80, security: true, maintenance: true, performance: true },
  }
}

function mockResult(suggestions: DependencySuggestion[] = [mockSuggestion()]): AnalysisResult {
  return {
    summary: { totalDependencies: 1, issues: 1, suggestions: 1, savings: { size: 80, dependencies: 1 }, duration: 10 },
    issues: [],
    suggestions,
    warnings: [],
    metadata: { timestamp: '2026-01-01T00:00:00Z', packageJsonPath: 'package.json', checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true } },
  }
}

describe('generateFixCode', () => {
  it('should generate remove commands', async () => {
    const suggestion = mockSuggestion({ type: 'remove', package: 'lodash', commands: [] })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0', devDependencies: { lodash: '^4.0.0' } })
    expect(result.commands).toContain('npm uninstall lodash')
    expect(result.commands).toContain('npm uninstall lodash --save-dev')
  })

  it('should generate replace commands with install', async () => {
    const suggestion = mockSuggestion({ type: 'replace', package: 'axios', replacement: 'fetch', commands: [], version: '^1.0.0' })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0', dependencies: { axios: '^1.0.0' } })
    expect(result.commands.some(c => c.includes('npm uninstall axios'))).toBe(true)
    expect(result.commands.some(c => c.includes('npm install fetch'))).toBe(true)
  })

  it('should generate upgrade commands', async () => {
    const suggestion = mockSuggestion({ type: 'upgrade', package: 'express', version: '^4.18.0', commands: [] })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0' })
    expect(result.commands.some(c => c.includes('npm install express@^4.18.0'))).toBe(true)
  })

  it('should generate downgrade commands', async () => {
    const suggestion = mockSuggestion({ type: 'downgrade', package: 'express', version: '^4.0.0', commands: [] })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0' })
    expect(result.commands.some(c => c.includes('npm install express@^4.0.0'))).toBe(true)
  })

  it('should generate code patches for axios→fetch', async () => {
    const suggestion = mockSuggestion({ type: 'replace', package: 'axios', replacement: 'fetch', commands: [] })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0' })
    expect(result.patches).toBeDefined()
    expect(result.patches!.length).toBeGreaterThan(0)
  })

  it('should generate code patches for lodash', async () => {
    const suggestion = mockSuggestion({ type: 'replace', package: 'lodash', replacement: 'native', commands: [] })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0' })
    expect(result.patches).toBeDefined()
    expect(result.patches!.length).toBeGreaterThan(0)
  })

  it('should generate code patches for moment', async () => {
    const suggestion = mockSuggestion({ type: 'replace', package: 'moment', replacement: 'Intl', commands: [] })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0' })
    expect(result.patches).toBeDefined()
    expect(result.patches!.length).toBeGreaterThan(0)
  })

  it('should generate code patches for uuid', async () => {
    const suggestion = mockSuggestion({ type: 'replace', package: 'uuid', replacement: 'crypto.randomUUID', commands: [] })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0' })
    expect(result.patches).toBeDefined()
    expect(result.patches!.length).toBeGreaterThan(0)
  })

  it('should not generate patches for unknown packages', async () => {
    const suggestion = mockSuggestion({ type: 'remove', package: 'random-pkg', commands: [] })
    const result = await generateFixCode(suggestion, { name: 't', version: '1.0.0' })
    expect(result.patches).toBeUndefined()
  })
})

describe('generateFixes', () => {
  it('should enrich suggestions with fix code', async () => {
    const result = await generateFixes(
      { name: 't', version: '1.0.0', dependencies: { axios: '^1.0.0' } },
      mockResult()
    )
    expect(result.suggestions[0].action.commands).toBeDefined()
    expect(result.suggestions[0].action.commands!.length).toBeGreaterThan(0)
  })

  it('should handle empty suggestions', async () => {
    const result = await generateFixes(
      { name: 't', version: '1.0.0' },
      mockResult([])
    )
    expect(result.suggestions).toHaveLength(0)
  })
})

describe('applyFixes', () => {
  let dir: string

  afterEach(() => {
    if (dir && dir.length > 0) rmSync(dir, { recursive: true, force: true })
  })

  it('should remove a package from dependencies', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
    const pkgPath = join(dir, 'package.json')
    const pkg: PackageJson = { name: 't', version: '1.0.0', dependencies: { axios: '^1.0.0' } }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    const suggestion = mockSuggestion({ type: 'remove', package: 'axios', commands: [] })
    const result = await applyFixes(pkg, mockResult([suggestion]), pkgPath)

    expect(result).toBe(true)
    const updated = JSON.parse(readFileSync(pkgPath, 'utf8'))
    expect(updated.dependencies).toEqual({})
  })

  it('should remove a package from devDependencies', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
    const pkgPath = join(dir, 'package.json')
    const pkg: PackageJson = { name: 't', version: '1.0.0', devDependencies: { lodash: '^4.0.0' } }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    const suggestion = mockSuggestion({ type: 'remove', package: 'lodash', commands: [] })
    const result = await applyFixes(pkg, mockResult([suggestion]), pkgPath)

    expect(result).toBe(true)
    const updated = JSON.parse(readFileSync(pkgPath, 'utf8'))
    expect(updated.devDependencies).toEqual({})
  })

  it('should upgrade a package version', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
    const pkgPath = join(dir, 'package.json')
    const pkg: PackageJson = { name: 't', version: '1.0.0', dependencies: { express: '^4.0.0' } }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    const suggestion = mockSuggestion({ type: 'upgrade', package: 'express', version: '^4.18.0', commands: [] })
    const result = await applyFixes(pkg, mockResult([suggestion]), pkgPath)

    expect(result).toBe(true)
    const updated = JSON.parse(readFileSync(pkgPath, 'utf8'))
    expect(updated.dependencies.express).toBe('^4.18.0')
  })

  it('should replace a package (remove old + add new)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
    const pkgPath = join(dir, 'package.json')
    const pkg: PackageJson = { name: 't', version: '1.0.0', dependencies: { axios: '^1.0.0' } }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    const suggestion = mockSuggestion({ type: 'replace', package: 'axios', replacement: 'fetch', version: '^1.0.0', commands: [] })
    const result = await applyFixes(pkg, mockResult([suggestion]), pkgPath)

    expect(result).toBe(true)
    const updated = JSON.parse(readFileSync(pkgPath, 'utf8'))
    expect(updated.dependencies).not.toHaveProperty('axios')
    expect(updated.dependencies).toHaveProperty('fetch')
  })

  it('should handle missing package gracefully (no crash)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fix-test-'))
    const pkgPath = join(dir, 'package.json')
    const pkg: PackageJson = { name: 't', version: '1.0.0', dependencies: {} }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    const suggestion = mockSuggestion({ type: 'remove', package: 'nonexistent', commands: [] })
    const result = await applyFixes(pkg, mockResult([suggestion]), pkgPath)

    expect(result).toBe(true)
  })
})
