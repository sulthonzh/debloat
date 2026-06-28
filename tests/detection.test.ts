import { describe, it, expect } from 'vitest'
import { detectFunctionalOverlap } from '../src/core/detection/functional-overlap.js'
import { detectBuiltInReplacements } from '../src/core/detection/built-in-replacements.js'
import type { AnalysisConfig } from '../src/types/analysis.js'

const mockConfig: AnalysisConfig = {
  checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true },
}

describe('detectFunctionalOverlap', () => {
  it('should detect overlapping date libraries', async () => {
    const result = await detectFunctionalOverlap(
      { moment: '^2.0.0', 'date-fns': '^2.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].type).toBe('functional-overlap')
    expect(result.issues[0].severity.level).toBe('medium')
  })

  it('should detect overlapping HTTP clients', async () => {
    const result = await detectFunctionalOverlap(
      { axios: '^1.0.0', 'node-fetch': '^3.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    const httpIssue = result.issues.find(i => i.package === 'http-client')
    expect(httpIssue).toBeDefined()
  })

  it('should detect overlapping state management', async () => {
    const result = await detectFunctionalOverlap(
      { zustand: '^4.0.0', redux: '^5.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should detect overlapping utility libraries', async () => {
    const result = await detectFunctionalOverlap(
      { lodash: '^4.0.0', underscore: '^1.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should detect overlapping validation libraries', async () => {
    const result = await detectFunctionalOverlap(
      { zod: '^3.0.0', joi: '^17.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should detect overlapping logging libraries', async () => {
    const result = await detectFunctionalOverlap(
      { winston: '^3.0.0', pino: '^8.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should detect overlapping testing frameworks', async () => {
    const result = await detectFunctionalOverlap(
      { jest: '^29.0.0', mocha: '^10.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should NOT detect overlap for single package per category', async () => {
    const result = await detectFunctionalOverlap(
      { axios: '^1.0.0', react: '^18.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(0)
  })

  it('should NOT detect overlap for unrelated packages', async () => {
    const result = await detectFunctionalOverlap(
      { react: '^18.0.0', express: '^4.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(0)
  })

  it('should generate suggestions for redundant packages', async () => {
    const result = await detectFunctionalOverlap(
      { moment: '^2.0.0', 'date-fns': '^2.0.0', dayjs: '^1.0.0' },
      mockConfig
    )
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions[0].action.type).toBe('replace')
    expect(result.suggestions[0].benefits.length).toBeGreaterThan(0)
    expect(result.suggestions[0].risks.length).toBeGreaterThan(0)
  })

  it('should handle empty dependencies', async () => {
    const result = await detectFunctionalOverlap({}, mockConfig)
    expect(result.issues).toHaveLength(0)
    expect(result.suggestions).toHaveLength(0)
  })

  it('should handle unknown packages', async () => {
    const result = await detectFunctionalOverlap(
      { 'random-unknown-pkg': '^1.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(0)
  })

  it('should calculate severity based on number of overlaps', async () => {
    const result = await detectFunctionalOverlap(
      { jest: '^29.0.0', mocha: '^10.0.0', chai: '^4.0.0', sinon: '^15.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    // More overlaps = higher score (capped at 8)
    expect(result.issues[0].severity.score).toBeLessThanOrEqual(8)
  })
})

describe('detectBuiltInReplacements', () => {
  it('should detect axios as replaceable with fetch', async () => {
    const result = await detectBuiltInReplacements(
      { axios: '^1.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].package).toBe('axios')
    expect(result.issues[0].description).toMatch(/fetch/i)
  })

  it('should detect node-fetch as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { 'node-fetch': '^3.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].package).toBe('node-fetch')
  })

  it('should detect lodash as replaceable with native', async () => {
    const result = await detectBuiltInReplacements(
      { lodash: '^4.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].package).toBe('lodash')
  })

  it('should detect moment as replaceable with Intl', async () => {
    const result = await detectBuiltInReplacements(
      { moment: '^2.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].description).toMatch(/Intl/)
  })

  it('should detect date-fns as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { 'date-fns': '^2.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should detect uuid as replaceable with crypto.randomUUID', async () => {
    const result = await detectBuiltInReplacements(
      { uuid: '^9.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].description).toMatch(/crypto/)
  })

  it('should detect querystring as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { querystring: '^0.2.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].description).toMatch(/URLSearchParams/)
  })

  it('should detect form-data as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { 'form-data': '^4.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should detect cookie as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { cookie: '^0.5.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should detect debug as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { debug: '^4.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should detect crypto-js as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { 'crypto-js': '^4.0.0' },
      mockConfig
    )
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].description).toMatch(/Web Crypto/)
  })

  it('should NOT flag react as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { react: '^18.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(0)
  })

  it('should NOT flag express as replaceable', async () => {
    const result = await detectBuiltInReplacements(
      { express: '^4.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(0)
  })

  it('should generate suggestions with commands', async () => {
    const result = await detectBuiltInReplacements(
      { axios: '^1.0.0' },
      mockConfig
    )
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions[0].action.commands).toContain('npm uninstall axios')
    expect(result.suggestions[0].action.confidence).toBe(0.9)
  })

  it('should generate suggestion benefits and risks', async () => {
    const result = await detectBuiltInReplacements(
      { lodash: '^4.0.0' },
      mockConfig
    )
    expect(result.suggestions[0].benefits.length).toBeGreaterThan(0)
    expect(result.suggestions[0].risks.length).toBeGreaterThan(0)
  })

  it('should handle empty dependencies', async () => {
    const result = await detectBuiltInReplacements({}, mockConfig)
    expect(result.issues).toHaveLength(0)
    expect(result.suggestions).toHaveLength(0)
  })

  it('should handle multiple replaceable packages', async () => {
    const result = await detectBuiltInReplacements(
      { axios: '^1.0.0', lodash: '^4.0.0', moment: '^2.0.0', uuid: '^9.0.0' },
      mockConfig
    )
    expect(result.issues).toHaveLength(4)
    expect(result.suggestions).toHaveLength(4)
  })
})
