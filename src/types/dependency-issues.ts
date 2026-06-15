export interface IssueSeverity {
  level: 'low' | 'medium' | 'high' | 'critical'
  score: number // 1-10
}

export interface DependencyImpact {
  size: number // estimated size in KB
  security: boolean
  maintenance: boolean
  performance: boolean
}

export interface DependencyIssue {
  type: 'functional-overlap' | 'built-in-replacement' | 'hallucination' | 'security-risk'
  package: string
  version?: string
  severity: IssueSeverity
  description: string
  alternatives?: string[]
  impact?: DependencyImpact
  category: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'
  evidence?: {
    packages: string[]
    reason: string
  }
}

export interface SuggestionAction {
  type: 'remove' | 'replace' | 'upgrade' | 'downgrade'
  package: string
  version?: string
  reason: string
  confidence: number // 0-1
  commands?: string[]
}

export interface DependencySuggestion {
  package: string
  action: SuggestionAction
  benefits: string[]
  risks: string[]
  estimatedImpact: DependencyImpact
}

export interface DependencyWarning {
  type: 'package-not-found' | 'version-mismatch' | 'integrity-check'
  package: string
  version?: string
  message: string
  suggestion?: string
}