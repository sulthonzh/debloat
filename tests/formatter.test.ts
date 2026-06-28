import { describe, it, expect } from 'vitest'
import { formatResults, formatIssue, formatSuggestion, formatJsonOutput, generateSummaryReport } from '../src/utils/formatter.js'
import type { AnalysisResult, DependencyIssue, DependencySuggestion } from '../src/types/analysis.js'

function mockIssue(overrides: Partial<DependencyIssue> = {}): DependencyIssue {
  return {
    type: 'built-in-replacement',
    package: 'axios',
    version: '^1.0.0',
    severity: { level: 'medium', score: 6 },
    description: 'Package can be replaced with native API: fetch',
    evidence: { packages: ['axios'], reason: 'Native fetch API available' },
    impact: { size: 80, security: true, maintenance: true, performance: true },
    category: 'dependencies',
    ...overrides,
  }
}

function mockSuggestion(overrides: Partial<DependencySuggestion> = {}): DependencySuggestion {
  return {
    package: 'axios@^1.0.0',
    action: {
      type: 'replace',
      package: 'axios',
      version: '^1.0.0',
      reason: 'Native fetch API available',
      confidence: 0.9,
      commands: ['npm uninstall axios'],
    },
    benefits: ['Zero additional dependencies', 'Better performance'],
    risks: ['Migration effort required'],
    estimatedImpact: { size: 80, security: true, maintenance: true, performance: true },
    ...overrides,
  }
}

function mockResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    summary: {
      totalDependencies: 5,
      issues: 1,
      suggestions: 1,
      savings: { size: 80, dependencies: 1 },
      duration: 42,
    },
    issues: [mockIssue()],
    suggestions: [mockSuggestion()],
    warnings: [],
    metadata: {
      timestamp: '2026-01-01T00:00:00.000Z',
      packageJsonPath: 'package.json',
      checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true },
    },
    ...overrides,
  }
}

describe('formatResults', () => {
  it('should include header', () => {
    const out = formatResults(mockResult())
    expect(out).toContain('Dependency Bloat Analysis')
  })

  it('should include summary stats', () => {
    const out = formatResults(mockResult())
    expect(out).toContain('Total dependencies analyzed: 5')
    expect(out).toContain('Issues found: 1')
    expect(out).toContain('Suggestions: 1')
  })

  it('should list issues', () => {
    const out = formatResults(mockResult())
    expect(out).toContain('Issues Found')
    expect(out).toContain('axios')
  })

  it('should show "no issues" when clean', () => {
    const out = formatResults(mockResult({ issues: [] }))
    expect(out).toContain('No issues found')
  })

  it('should show warnings', () => {
    const out = formatResults(mockResult({
      warnings: [{
        type: 'package-not-found',
        package: 'test',
        version: '1.0.0',
        message: 'Package test may be a typo of test2',
        suggestion: 'Did you mean test2?',
      }]
    }))
    expect(out).toContain('Warnings')
    expect(out).toContain('typo')
  })

  it('should show suggestions', () => {
    const out = formatResults(mockResult())
    expect(out).toContain('Suggestions')
    expect(out).toContain('replace axios')
  })

  it('should include verbose details when verbose=true', () => {
    const out = formatResults(mockResult(), true)
    expect(out).toContain('Severity: medium (6/10)')
    expect(out).toContain('Confidence: 90%')
    expect(out).toContain('Benefits:')
    expect(out).toContain('Risks:')
  })
})

describe('formatIssue', () => {
  it('should format with package name and version', () => {
    const out = formatIssue(mockIssue())
    expect(out).toContain('axios')
    expect(out).toContain('^1.0.0')
  })

  it('should include category when not "dependencies"', () => {
    const out = formatIssue(mockIssue({ category: 'security' }))
    expect(out).toContain('[security]')
  })
})

describe('formatSuggestion', () => {
  it('should format replace action', () => {
    const out = formatSuggestion(mockSuggestion())
    expect(out).toContain('replace')
    expect(out).toContain('axios')
  })

  it('should include replacement when specified', () => {
    const out = formatSuggestion(mockSuggestion({
      action: { ...mockSuggestion().action, replacement: 'fetch' } as never
    }))
    expect(out).toContain('fetch')
  })
})

describe('formatJsonOutput', () => {
  it('should produce valid JSON', () => {
    const out = formatJsonOutput(mockResult())
    const parsed = JSON.parse(out)
    expect(parsed.summary.totalDependencies).toBe(5)
    expect(parsed.issues).toHaveLength(1)
  })
})

describe('generateSummaryReport', () => {
  it('should produce markdown report', () => {
    const out = generateSummaryReport(mockResult())
    expect(out).toContain('# Dependency Bloat Analysis Report')
    expect(out).toContain('## Summary')
    expect(out).toContain('Total dependencies: 5')
  })

  it('should include issues section', () => {
    const out = generateSummaryReport(mockResult())
    expect(out).toContain('## Issues')
    expect(out).toContain('axios')
  })

  it('should include suggestions section', () => {
    const out = generateSummaryReport(mockResult())
    expect(out).toContain('## Suggestions')
  })
})
