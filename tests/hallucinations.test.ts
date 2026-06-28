import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  detectHallucinations,
  checkPackageExists,
  checkSuspiciousPatterns,
  checkPotentialTypos,
  levenshteinDistance,
  estimatePackageSize,
} from '../src/core/detection/hallucinations.js'
import type { AnalysisConfig } from '../src/types/analysis.js'

const mockConfig: AnalysisConfig = {
  checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true },
}

describe('checkSuspiciousPatterns', () => {
  it('should flag very short package names (≤2 chars)', () => {
    expect(checkSuspiciousPatterns('ab')).not.toBeNull()
    expect(checkSuspiciousPatterns('ab')?.reason).toMatch(/short/i)
  })

  it('should flag single char names', () => {
    expect(checkSuspiciousPatterns('x')).not.toBeNull()
  })

  it('should flag very long package names (≥40 chars)', () => {
    const long = 'a'.repeat(45)
    expect(checkSuspiciousPatterns(long)).not.toBeNull()
    expect(checkSuspiciousPatterns(long)?.reason).toMatch(/long/i)
  })

  it('should flag names with numbers', () => {
    expect(checkSuspiciousPatterns('pkg123')).not.toBeNull()
    expect(checkSuspiciousPatterns('pkg123')?.reason).toMatch(/number/i)
  })

  it('should flag names with file extensions', () => {
    expect(checkSuspiciousPatterns('mything.js')).not.toBeNull()
    expect(checkSuspiciousPatterns('mything.ts')).not.toBeNull()
    expect(checkSuspiciousPatterns('mything.json')).not.toBeNull()
  })

  it('should flag names with TLDs', () => {
    expect(checkSuspiciousPatterns('mything.com')).not.toBeNull()
    expect(checkSuspiciousPatterns('mything.io')).not.toBeNull()
    expect(checkSuspiciousPatterns('mything.ai')).not.toBeNull()
  })

  it('should NOT flag normal package names', () => {
    expect(checkSuspiciousPatterns('typescript')).toBeNull()
    expect(checkSuspiciousPatterns('react')).toBeNull()
    expect(checkSuspiciousPatterns('express')).toBeNull()
  })
})

describe('checkPotentialTypos', () => {
  it('should detect known typo "axois" → "axios"', () => {
    expect(checkPotentialTypos('axois')).toBe('axios')
  })

  it('should detect known typo "lodas" → "lodash"', () => {
    expect(checkPotentialTypos('lodas')).toBe('lodash')
  })

  it('should detect known typo "lodah" → "lodash"', () => {
    expect(checkPotentialTypos('lodah')).toBe('lodash')
  })

  it('should detect known typo "expresss" → "express"', () => {
    expect(checkPotentialTypos('expresss')).toBe('express')
  })

  it('should detect known typo "jestt" → "jest"', () => {
    expect(checkPotentialTypos('jestt')).toBe('jest')
  })

  it('should detect known typo "prettieer" → "prettier"', () => {
    expect(checkPotentialTypos('prettieer')).toBe('prettier')
  })

  it('should detect known typo "eslintt" → "eslint"', () => {
    expect(checkPotentialTypos('eslintt')).toBe('eslint')
  })

  it('should detect known typo "typesscript" → "typescript"', () => {
    expect(checkPotentialTypos('typesscript')).toBe('typescript')
  })

  it('should detect known typo "typesript" → "typescript"', () => {
    expect(checkPotentialTypos('typesript')).toBe('typescript')
  })

  it('should detect one-character typos via Levenshtein', () => {
    // "reactt" is 1 edit from "react"
    expect(checkPotentialTypos('reactt')).toBe('react')
    // "mochaq" is 1 edit from "mocha"
    expect(checkPotentialTypos('mochaq')).toBe('mocha')
  })

  it('should NOT flag correct package names', () => {
    expect(checkPotentialTypos('axios')).toBeNull()
    expect(checkPotentialTypos('lodash')).toBeNull()
    expect(checkPotentialTypos('react')).toBeNull()
  })

  it('should NOT flag random unrelated names', () => {
    expect(checkPotentialTypos('totally-unique-name')).toBeNull()
  })
})

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0)
  })

  it('should return length for empty vs non-empty', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3)
    expect(levenshteinDistance('abc', '')).toBe(3)
  })

  it('should return 0 for both empty', () => {
    expect(levenshteinDistance('', '')).toBe(0)
  })

  it('should compute single substitution', () => {
    expect(levenshteinDistance('cat', 'cut')).toBe(1)
  })

  it('should compute single insertion', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1)
  })

  it('should compute single deletion', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1)
  })

  it('should compute multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
  })
})

describe('estimatePackageSize', () => {
  it('should return default 50 KB', () => {
    expect(estimatePackageSize('anything')).toBe(50)
  })
})

describe('checkPackageExists', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should return true when npm registry returns 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {}, '2.0.0': {} } }),
    }))
    const result = await checkPackageExists('express', '1.0.0')
    expect(result).toBe(true)
  })

  it('should return true for latest version', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {} } }),
    }))
    const result = await checkPackageExists('express', 'latest')
    expect(result).toBe(true)
  })

  it('should return true for ^ version range', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {}, '1.1.0': {} } }),
    }))
    const result = await checkPackageExists('express', '^1.0.0')
    expect(result).toBe(true)
  })

  it('should return true for ~ version range', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {}, '1.0.1': {} } }),
    }))
    const result = await checkPackageExists('express', '~1.0.0')
    expect(result).toBe(true)
  })

  it('should return true for wildcard version', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {} } }),
    }))
    const result = await checkPackageExists('express', '*')
    expect(result).toBe(true)
  })

  it('should return true for OR range', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {} } }),
    }))
    const result = await checkPackageExists('express', '1.0.0 || 2.0.0')
    expect(result).toBe(true)
  })

  it('should return true for greater-than range', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {} } }),
    }))
    const result = await checkPackageExists('express', ' > 0.9.0')
    expect(result).toBe(true)
  })

  it('should return true even when version not found (package exists)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {} } }),
    }))
    const result = await checkPackageExists('express', '99.0.0')
    expect(result).toBe(true)
  })

  it('should return false when npm returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 404,
    }))
    const result = await checkPackageExists('nonexistent-pkg-xyz', '1.0.0')
    expect(result).toBe(false)
  })

  it('should return true (conservative) on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const result = await checkPackageExists('express', '1.0.0')
    expect(result).toBe(true)
  })

  it('should return true (conservative) on abort/timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    const result = await checkPackageExists('express', '1.0.0')
    expect(result).toBe(true)
  })
})

describe('detectHallucinations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should detect non-existent packages as hallucinations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 404,
    }))
    const result = await detectHallucinations({ 'nonexistent-xyz-abc': '1.0.0' }, mockConfig)
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].type).toBe('hallucination')
    expect(result.issues[0].severity.level).toBe('critical')
    expect(result.issues[0].description).toMatch(/does not exist/)
  })

  it('should detect suspicious package names', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {} } }),
    }))
    // 'ab' is suspiciously short AND has no match → both hallucination + suspicious
    // Actually fetch 200 means it exists, so only suspicious
    const result = await detectHallucinations({ ab: '1.0.0' }, mockConfig)
    // 'ab' is 2 chars → suspicious pattern triggers
    const suspiciousIssue = result.issues.find(i => i.description.includes('Suspicious'))
    expect(suspiciousIssue).toBeDefined()
    expect(suspiciousIssue!.severity.level).toBe('high')
  })

  it('should detect typosquatting attempts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '1.0.0': {} } }),
    }))
    const result = await detectHallucinations({ axois: '1.0.0' }, mockConfig)
    // axois exists? Probably not in registry → hallucination issue
    // But we mocked 200 so it "exists". Then checkPotentialTypos should catch it
    const typoWarning = result.warnings.find(w => w.message.includes('axois'))
    expect(typoWarning).toBeDefined()
    expect(typoWarning!.suggestion).toContain('axios')
  })

  it('should return empty results for clean dependencies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ versions: { '18.0.0': {} } }),
    }))
    const result = await detectHallucinations({ react: '^18.0.0' }, mockConfig)
    expect(result.issues).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should handle empty dependencies', async () => {
    const result = await detectHallucinations({}, mockConfig)
    expect(result.issues).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should include suggestions array in result', async () => {
    const result = await detectHallucinations({}, mockConfig)
    expect(result.suggestions).toEqual([])
  })
})
