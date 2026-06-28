import { DetectionResult } from '../../types/analysis.js'
import { DependencyIssue, DependencySuggestion } from '../../types/dependency-issues.js'
import { AnalysisConfig } from '../../types/analysis.js'

interface BuiltInReplacementInfo {
  replacement: string
  reason: string
  commands: string[]
  nodeVersion?: string
  features?: string[]
}

// Built-in replacement mappings
const BUILTIN_REPLACEMENTS: Record<string, BuiltInReplacementInfo> = {
  'axios': {
    replacement: 'fetch',
    reason: 'Modern browsers and Node.js have native fetch API',
    commands: ['npm uninstall axios'],
    nodeVersion: '18.0.0'
  },
  'node-fetch': {
    replacement: 'fetch',
    reason: 'Node.js 18+ has native fetch API',
    commands: ['npm uninstall node-fetch'],
    nodeVersion: '18.0.0'
  },
  'lodash': {
    replacement: 'native',
    reason: 'Many lodash functions are available natively in modern JS',
    commands: ['npm uninstall lodash'],
    features: ['map', 'filter', 'reduce', 'find', 'forEach', 'debounce', 'throttle']
  },
  'moment': {
    replacement: 'Intl',
    reason: 'Native Intl API provides comprehensive date/time support',
    commands: ['npm uninstall moment'],
    features: ['format', 'parse', 'timezone', 'relative time']
  },
  'date-fns': {
    replacement: 'Intl',
    reason: 'Native Intl API provides date/time functionality',
    commands: ['npm uninstall date-fns'],
    features: ['format', 'parse', 'relative time']
  },
  'uuid': {
    replacement: 'crypto.randomUUID',
    reason: 'Native crypto API provides UUID generation',
    commands: ['npm uninstall uuid'],
    features: ['random UUID generation']
  },
  'querystring': {
    replacement: 'URLSearchParams',
    reason: 'Native URLSearchParams API for query string manipulation',
    commands: ['npm uninstall querystring'],
    features: ['parse', 'stringify', 'append', 'delete']
  },
  'form-data': {
    replacement: 'native',
    reason: 'Native FormData API available in modern browsers and Node.js',
    commands: ['npm uninstall form-data'],
    features: ['multipart form data']
  },
  'cookie': {
    replacement: 'document.cookie',
    reason: 'Native cookie API available in browsers',
    commands: ['npm uninstall cookie'],
    features: ['get', 'set', 'parse cookies']
  },
  'debug': {
    replacement: 'console.log',
    reason: 'Native console API provides debugging capabilities',
    commands: ['npm uninstall debug'],
    features: ['logging', 'debugging']
  },
  'util': {
    replacement: 'native',
    reason: 'Many Node.js util functions are available natively',
    commands: ['npm uninstall util'],
    features: ['format', 'inspect', 'promisify']
  },
  'crypto-js': {
    replacement: 'Web Crypto API',
    reason: 'Native Web Crypto API provides cryptographic functions',
    commands: ['npm uninstall crypto-js'],
    features: ['hashing', 'encryption', 'decryption']
  },
  'buffer': {
    replacement: 'Buffer constructor',
    reason: 'Native Buffer API available in Node.js',
    commands: ['npm uninstall buffer'],
    features: ['buffer operations']
  }
}

export async function detectBuiltInReplacements(
  dependencies: Record<string, string>,
  _config: AnalysisConfig
): Promise<DetectionResult> {
  const issues: DependencyIssue[] = []
  const suggestions: DependencySuggestion[] = []

  // Check each dependency for built-in replacements
  Object.entries(dependencies).forEach(([pkg, version]) => {
    const replacementInfo = BUILTIN_REPLACEMENTS[pkg]
    
    if (replacementInfo) {
      const issue: DependencyIssue = {
        type: 'built-in-replacement',
        package: pkg,
        version,
        severity: {
          level: 'medium',
          score: 6
        },
        description: `Package can be replaced with native API: ${replacementInfo.replacement}`,
        evidence: {
          packages: [pkg],
          reason: replacementInfo.reason
        },
        impact: {
          size: estimatePackageSize(pkg),
          security: true,
          maintenance: true,
          performance: true
        },
        category: 'dependencies'
      }

      issues.push(issue)

      const suggestion: DependencySuggestion = {
        package: `${pkg}@${version}`,
        action: {
          type: 'replace',
          package: pkg,
          version,
          reason: replacementInfo.reason,
          confidence: 0.9,
          commands: replacementInfo.commands
        },
        benefits: [
          'Zero additional dependencies',
          'Better performance',
          'Native browser/Node.js support',
          'No security vulnerabilities from third-party packages'
        ],
        risks: [
          'Migration effort required',
          'Code may need updates',
          'Feature differences between native and package APIs'
        ],
        estimatedImpact: {
          size: estimatePackageSize(pkg),
          security: true,
          maintenance: true,
          performance: true
        }
      }

      suggestions.push(suggestion)
    }
  })

  return { issues, suggestions }
}

function estimatePackageSize(packageName: string): number {
  // Size estimates for built-in replacement candidates
  const sizeMap: Record<string, number> = {
    'axios': 80,
    'node-fetch': 15,
    'lodash': 70,
    'moment': 220,
    'date-fns': 50,
    'uuid': 30,
    'querystring': 5,
    'form-data': 25,
    'cookie': 10,
    'debug': 20,
    'util': 10,
    'crypto-js': 100,
    'buffer': 5
  }

  return sizeMap[packageName] || 50 // default 50KB
}