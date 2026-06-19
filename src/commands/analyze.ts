import { analyzeDependencies } from '../core/analysis.js'
import { formatResults, formatJsonOutput } from '../utils/formatter.js'
import { loadPackageJson } from '../utils/package-loader.js'

type CliOpts = Record<string, string | boolean>

export const analyzeCommand = {
  name: 'analyze' as const,
  description: 'Analyze package.json for dependency bloat',
  async run(opts: CliOpts) {
    try {
      const path = typeof opts.path === 'string' ? opts.path : './package.json'
      const packageJson = await loadPackageJson(path)
      
      if (!packageJson) {
        console.error('Error: package.json not found at the specified path')
        process.exit(1)
      }

      const results = await analyzeDependencies(packageJson, {
        lockfilePath: typeof opts.lockfile === 'string' ? opts.lockfile : './package-lock.json',
        verbose: !!opts.verbose,
        checks: {
          functionalOverlap: !opts['skip-functional-overlap'],
          builtInReplacements: !opts['skip-built-in-replacements'],
          hallucination: !opts['skip-hallucination-detection']
        }
      })

      if (opts.json) {
        console.log(formatJsonOutput(results))
      } else {
        console.log(formatResults(results, !!opts.verbose))
      }

      if (results.issues.length > 0) {
        process.exit(1)
      }
    } catch (error) {
      console.error('Error during analysis:', (error as Error).message)
      process.exit(1)
    }
  }
}
