import { AnalysisResult } from '../types/analysis.js'
import { DependencyIssue, DependencySuggestion, DependencyWarning } from '../types/dependency-issues.js'

export function formatResults(results: AnalysisResult, verbose: boolean = false): string {
  const output: string[] = []
  
  // Header
  output.push('🔍 Dependency Bloat Analysis Results')
  output.push('=====================================')
  
  // Summary
  output.push(`\n📊 Summary:`)
  output.push(`  Total dependencies analyzed: ${results.summary.totalDependencies}`)
  output.push(`  Issues found: ${results.summary.issues}`)
  output.push(`  Suggestions: ${results.summary.suggestions}`)
  output.push(`  Potential savings: ${results.summary.savings.size}KB, ${results.summary.savings.dependencies} dependencies`)
  output.push(`  Analysis completed in: ${results.summary.duration}ms`)
  
  // Issues
  if (results.issues.length > 0) {
    output.push('\n❌ Issues Found:')
    results.issues.forEach((issue, index) => {
      output.push(`  ${index + 1}. ${formatIssue(issue)}`)
      
      if (verbose) {
        output.push(`     Severity: ${issue.severity.level} (${issue.severity.score}/10)`)
        output.push(`     Category: ${issue.category}`)
        if (issue.evidence) {
          output.push(`     Evidence: ${issue.evidence.reason}`)
        }
        if (issue.impact) {
          output.push(`     Impact: Size: ${issue.impact.size}KB, Security: ${issue.impact.security ? '✓' : '✗'}, Maintenance: ${issue.impact.maintenance ? '✓' : '✗'}`)
        }
      }
    })
  } else {
    output.push('\n✅ No issues found!')
  }
  
  // Warnings
  if (results.warnings.length > 0) {
    output.push('\n⚠️  Warnings:')
    results.warnings.forEach((warning, index) => {
      output.push(`  ${index + 1}. ${warning.message}`)
      if (warning.suggestion) {
        output.push(`     Suggestion: ${warning.suggestion}`)
      }
    })
  }
  
  // Suggestions
  if (results.suggestions.length > 0) {
    output.push('\n💡 Suggestions:')
    results.suggestions.forEach((suggestion, index) => {
      output.push(`  ${index + 1}. ${formatSuggestion(suggestion)}`)
      
      if (verbose) {
        output.push(`     Benefits: ${suggestion.benefits.join(', ')}`)
        output.push(`     Risks: ${suggestion.risks.join(', ')}`)
        output.push(`     Confidence: ${(suggestion.action.confidence * 100).toFixed(0)}%`)
        if (suggestion.action.commands) {
          output.push(`     Commands: ${suggestion.action.commands.join(', ')}`)
        }
      }
    })
  }
  
  return output.join('\n')
}

export function formatIssue(issue: DependencyIssue): string {
  let output = `${issue.description}`
  
  if (issue.package) {
    output += ` (${issue.package}`
    if (issue.version) {
      output += `@${issue.version}`
    }
    output += ')'
  }
  
  if (issue.category !== 'dependencies') {
    output += ` [${issue.category}]`
  }
  
  return output
}

export function formatSuggestion(suggestion: DependencySuggestion): string {
  const action = suggestion.action
  let output = `${action.type} ${action.package}`
  
  if (action.version) {
    output += `@${action.version}`
  }
  
  if (action.replacement) {
    output += ` → ${action.replacement}`
  }
  
  output += `: ${action.reason}`
  
  return output
}

export function formatJsonOutput(results: AnalysisResult): string {
  return JSON.stringify(results, null, 2)
}

export function generateSummaryReport(results: AnalysisResult): string {
  const output: string[] = []
  
  output.push('# Dependency Bloat Analysis Report')
  output.push(`Generated: ${new Date().toISOString()}`)
  output.push('')
  
  output.push('## Summary')
  output.push(`- Total dependencies: ${results.summary.totalDependencies}`)
  output.push(`- Issues found: ${results.summary.issues}`)
  output.push(`- Suggestions: ${results.summary.suggestions}`)
  output.push(`- Potential size reduction: ${results.summary.savings.size}KB`)
  output.push(`- Dependencies that can be removed: ${results.summary.savings.dependencies}`)
  output.push('')
  
  if (results.issues.length > 0) {
    output.push('## Issues')
    results.issues.forEach((issue, index) => {
      output.push(`### ${index + 1}. ${formatIssue(issue)}`)
      output.push(`- Severity: ${issue.severity.level} (${issue.severity.score}/10)`)
      output.push(`- Type: ${issue.type}`)
      output.push('')
    })
  }
  
  if (results.suggestions.length > 0) {
    output.push('## Suggestions')
    results.suggestions.forEach((suggestion, index) => {
      output.push(`### ${index + 1}. ${formatSuggestion(suggestion)}`)
      output.push('')
    })
  }
  
  return output.join('\n')
}