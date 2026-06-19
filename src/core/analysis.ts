import { PackageJson } from '../types/package-json.js'
import { AnalysisConfig, AnalysisResult } from '../types/analysis.js'
import { detectFunctionalOverlap } from './detection/functional-overlap.js'
import { detectBuiltInReplacements } from './detection/built-in-replacements.js'
import { detectHallucinations } from './detection/hallucinations.js'
import { DependencyUtils } from '../utils/dependency-utils.js'

export async function analyzeDependencies(
  packageJson: PackageJson,
  config: AnalysisConfig
): Promise<AnalysisResult> {
  const startTime = Date.now()
  
  // Initialize result
  const result: AnalysisResult = {
    summary: {
      totalDependencies: 0,
      issues: 0,
      suggestions: 0,
      savings: {
        size: 0,
        dependencies: 0
      },
      duration: 0
    },
    issues: [],
    suggestions: [],
    warnings: [],
    metadata: {
      timestamp: new Date().toISOString(),
      packageJsonPath: config.lockfilePath || 'package.json',
      checks: {
        functionalOverlap: config.checks.functionalOverlap,
        builtInReplacements: config.checks.builtInReplacements,
        hallucination: config.checks.hallucination
      }
    }
  }

  // Collect all dependencies
  const dependencies = DependencyUtils.getAllDependencies(packageJson)
  result.summary.totalDependencies = Object.keys(dependencies).length

  if (config.verbose) {
    console.log(`📦 Analyzing ${result.summary.totalDependencies} dependencies...`)
  }

  // Check each detection type
  const detectionPromises = []

  // 1. Functional Overlap Detection
  if (config.checks.functionalOverlap) {
    detectionPromises.push(
      detectFunctionalOverlap(dependencies, config).then(results => {
        result.issues.push(...results.issues)
        result.suggestions.push(...results.suggestions)
        if (config.verbose && results.issues.length > 0) {
          console.log(`🔍 Found ${results.issues.length} functional overlaps`)
        }
      })
    )
  }

  // 2. Built-in Replacements
  if (config.checks.builtInReplacements) {
    detectionPromises.push(
      detectBuiltInReplacements(dependencies, config).then(results => {
        result.issues.push(...results.issues)
        result.suggestions.push(...results.suggestions)
        if (config.verbose && results.issues.length > 0) {
          console.log(`🔍 Found ${results.issues.length} built-in replacements`)
        }
      })
    )
  }

  // 3. Hallucination Detection
  if (config.checks.hallucination) {
    detectionPromises.push(
      detectHallucinations(dependencies, config).then(results => {
        result.issues.push(...results.issues)
        if (results.warnings) result.warnings.push(...results.warnings)
        if (config.verbose && results.issues.length > 0) {
          console.log(`🔍 Found ${results.issues.length} hallucinated dependencies`)
        }
      })
    )
  }

  // Wait for all detection to complete
  await Promise.all(detectionPromises)

  // Calculate summary
  result.summary.issues = result.issues.length
  result.summary.suggestions = result.suggestions.length
  
  // Calculate potential savings
  result.summary.savings.dependencies = result.issues.length
  result.summary.savings.size = result.issues.reduce((total, issue) => {
    return total + (issue.impact?.size || 0)
  }, 0)

  result.summary.duration = Date.now() - startTime

  return result
}