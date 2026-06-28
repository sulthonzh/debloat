import { analyzeDependencies } from '../core/analysis.js'
import { generateFixes, applyFixes } from '../core/fixes.js'
import { loadPackageJson } from '../utils/package-loader.js'
import { formatResults, formatJsonOutput } from '../utils/formatter.js'
import type { AnalysisResult } from '../types/analysis.js'

type CliOpts = Record<string, string | boolean>

export const fixCommand = {
  name: 'fix' as const,
  description: 'Generate and apply fixes for dependency bloat',
  async run(opts: CliOpts) {
    try {
      const path = typeof opts.path === 'string' ? opts.path : './package.json'
      const packageJson = await loadPackageJson(path)
      
      if (!packageJson) {
        console.error('Error: package.json not found at the specified path')
        process.exit(1)
      }

      // Run analysis first to get issues/suggestions
      const analysisResult = await analyzeDependencies(packageJson, {
        lockfilePath: typeof opts.lockfile === 'string' ? opts.lockfile : './package-lock.json',
        verbose: !!opts.verbose,
        checks: {
          functionalOverlap: !opts['skip-functional-overlap'],
          builtInReplacements: !opts['skip-built-in-replacements'],
          hallucination: !opts['skip-hallucination-detection']
        }
      })

      // Generate fixes from analysis result
      const fixes = await generateFixes(packageJson, analysisResult)

      if (opts['dry-run']) {
        if (opts.json) {
          console.log(formatJsonOutput({ ...fixes, dryRun: true } as unknown as AnalysisResult))
        } else {
          console.log(formatResults(fixes, !!opts.verbose))
          console.log('\nDRY RUN: No changes were made to package.json')
        }
        return
      }

      if (opts.autoApply || opts.a) {
        const applied = await applyFixes(packageJson, fixes, path)
        if (applied) {
          console.log('✅ Successfully applied fixes to package.json')
          if (!opts.json) {
            console.log(formatResults(fixes, !!opts.verbose))
          }
        } else {
          console.error('❌ Failed to apply fixes')
          process.exit(1)
        }
      } else {
        if (opts.json) {
          console.log(formatJsonOutput(fixes))
        } else {
          console.log('🔍 Suggested fixes:')
          console.log(formatResults(fixes, !!opts.verbose))
          console.log('\nTo apply these fixes, use --auto-apply or run:')
          console.log('  debloat fix --auto-apply')
        }
      }
    } catch (error) {
      console.error('Error during fix generation:', (error as Error).message)
      process.exit(1)
    }
  }
}
