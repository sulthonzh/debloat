import { DetectionResult } from '../../types/analysis.js'
import { DependencyIssue, DependencyWarning } from '../../types/dependency-issues.js'
import { AnalysisConfig } from '../../types/analysis.js'

// Common package name variations and potential typos
const COMMON_PACKAGES = [
  'react', 'vue', 'angular', 'express', 'lodash', 'axios', 'moment',
  'webpack', 'babel', 'eslint', 'prettier', 'jest', 'mocha', 'chai',
  'typescript', 'tailwindcss', 'bootstrap', 'material-ui', 'nextjs',
  'gatsby', 'nuxt', 'svelte', 'lit', 'fastify', 'knex', 'prisma',
  'graphql', 'apollo', 'urql', 'react-query', 'swr', 'zod', 'joi',
  'yup', 'ajv', 'mongoose', 'sequelize', 'redis', 'mongodb',
  'postgres', 'mysql', 'sqlite', 'firebase', 'supabase', 'vercel',
  'netlify', 'aws-sdk', 'google-cloud', 'azure', 'cloudinary',
  'sharp', 'imagemin', 'file-type', 'mime-types', 'multer', 'formidable',
  'cookie', 'cookie-parser', 'session', 'passport', 'bcrypt', 'jsonwebtoken',
  'crypto', 'bcryptjs', 'node-fetch', 'undici', 'ky',
  'winston', 'pino', 'bunyan', 'log4js', 'debug', 'morgan'
]

// Common package name patterns that indicate potential issues
const SUSPICIOUS_PATTERNS = [
  // Suspicious length packages (very short or very long)
  { maxLen: 2, reason: 'Suspiciously short package name' },
  { minLen: 40, reason: 'Suspiciously long package name' },
  
  // Numbers in package names (sometimes indicate low quality)
  { pattern: /\d+/, reason: 'Package contains numbers - may be low quality' },
  
  // Double extensions
  { pattern: /\.(js|ts|json)$/, reason: 'Package has file extension in name' },
  
  // Suspicious TLDs
  { pattern: /\.(com|net|org|io|ai|co)$/i, reason: 'Package has TLD in name' }
]

export async function detectHallucinations(
  dependencies: Record<string, string>,
  config: AnalysisConfig
): Promise<DetectionResult> {
  const issues: DependencyIssue[] = []
  const warnings: DependencyWarning[] = []

  for (const [pkg, version] of Object.entries(dependencies)) {
    // Check if package exists in npm registry
    const exists = await checkPackageExists(pkg, version)
    
    if (!exists) {
      const issue: DependencyIssue = {
        type: 'hallucination',
        package: pkg,
        version: version,
        severity: {
          level: 'critical',
          score: 10
        },
        description: `Package '${pkg}' does not exist in npm registry`,
        evidence: {
          packages: [pkg],
          reason: 'Package not found in npm registry'
        },
        impact: {
          size: 0,
          security: true,
          maintenance: true,
          performance: true
        },
        category: 'dependencies'
      }

      issues.push(issue)
      continue
    }

    // Check for suspicious patterns
    const suspicious = checkSuspiciousPatterns(pkg)
    if (suspicious) {
      const issue: DependencyIssue = {
        type: 'hallucination',
        package: pkg,
        version: version,
        severity: {
          level: 'high',
          score: 8
        },
        description: `Suspicious package name: ${suspicious.reason}`,
        evidence: {
          packages: [pkg],
          reason: suspicious.reason
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
    }

    // Check for potential typosquatting
    const potentialTypos = checkPotentialTypos(pkg)
    if (potentialTypos) {
      const warning: DependencyWarning = {
        type: 'package-not-found',
        package: pkg,
        version: version,
        message: `Package '${pkg}' may be a typo of '${potentialTypos}'`,
        suggestion: `Did you mean '${potentialTypos}'?`
      }

      warnings.push(warning)
    }
  }

  return { issues, warnings, suggestions: [] }
}

/**
 * Check if a package exists in the npm registry.
 * Uses native fetch (Node.js 18+).
 * If the network is unavailable, conservatively assumes the package exists.
 */
export async function checkPackageExists(pkg: string, version: string): Promise<boolean> {
  try {
    // Add 3-second timeout to avoid hanging on network issues
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const response = await fetch(`https://registry.npmjs.org/${pkg}`, {
      signal: controller.signal
    })
    clearTimeout(timeout)
    
    if (response.status === 200) {
      const data = await response.json() as { versions?: Record<string, unknown> }
      
      // Check if specific version exists
      if (version === 'latest' || data.versions?.[version]) {
        return true
      }
      
      // Check if version range is valid (^ or ~)
      if (version.startsWith('^') || version.startsWith('~')) {
        const baseVersion = version.slice(1).split('.')[0]
        const versions = Object.keys(data.versions || {})
        // FIX: use for...of instead of forEach so we can actually return
        for (const v of versions) {
          if (v.startsWith(baseVersion)) {
            return true
          }
        }
      }
      
      // Version specified but not found in registry
      // If version is a wildcard or range, package exists
      if (version === '*' || version.includes('||') || version.includes(' > ')) {
        return true
      }
      
      // Package exists but version doesn't match — still count as exists
      return true
    }
    
    return false
  } catch {
    // Network error — be conservative, assume it exists
    return true
  }
}

/**
 * Check if a package name matches suspicious patterns.
 */
export function checkSuspiciousPatterns(pkg: string): { reason: string } | null {
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.pattern instanceof RegExp) {
      if (pattern.pattern.test(pkg)) {
        return { reason: pattern.reason }
      }
    } else {
      const { minLen, maxLen } = pattern as { minLen?: number; maxLen?: number; reason: string }
      
      if (maxLen !== undefined && pkg.length <= maxLen) {
        return { reason: pattern.reason }
      }
      
      if (minLen !== undefined && pkg.length >= minLen) {
        return { reason: pattern.reason }
      }
    }
  }
  
  return null
}

/**
 * Check if a package name is a likely typo of a common package.
 */
export function checkPotentialTypos(pkg: string): string | null {
  // Common typos for popular packages
  const typoMap: Record<string, string[]> = {
    'axois': ['axios'],
    'lodas': ['lodash'],
    'lodah': ['lodash'],
    'reac': ['react'],
    'reu': ['react'],
    'vuee': ['vue'],
    'expresss': ['express'],
    'jestt': ['jest'],
    'mochaa': ['mocha'],
    'chaii': ['chai'],
    'typesscript': ['typescript'],
    'typesript': ['typescript'],
    'prettieer': ['prettier'],
    'eslintt': ['eslint'],
  }

  // Check for exact matches in typo map
  for (const [typo, correct] of Object.entries(typoMap)) {
    if (pkg === typo) {
      return correct[0]
    }
  }

  // Check for one-character differences (Levenshtein distance = 1)
  for (const correct of COMMON_PACKAGES) {
    if (levenshteinDistance(pkg, correct) === 1) {
      return correct
    }
  }

  return null
}

/**
 * Compute Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      )
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Estimate package size in KB (rough heuristic).
 */
export function estimatePackageSize(packageName: string): number {
  return 50 // KB default
}
