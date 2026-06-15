import { DependencyIssue, DependencySuggestion, DependencyWarning } from './dependency-issues.js'

export interface AnalysisConfig {
  lockfilePath?: string
  verbose?: boolean
  checks: {
    functionalOverlap: boolean
    builtInReplacements: boolean
    hallucination: boolean
  }
}

export interface AnalysisResult {
  summary: {
    totalDependencies: number
    issues: number
    suggestions: number
    savings: {
      size: number // in KB
      dependencies: number
    }
    duration: number // in ms
  }
  issues: DependencyIssue[]
  suggestions: DependencySuggestion[]
  warnings: DependencyWarning[]
  metadata: {
    timestamp: string
    packageJsonPath: string
    checks: AnalysisConfig['checks']
  }
}

export interface DetectionResult {
  issues: DependencyIssue[]
  suggestions: DependencySuggestion[]
  warnings?: DependencyWarning[]
}