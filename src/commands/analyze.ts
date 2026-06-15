import { Command } from 'commander'
import { analyzeDependencies } from '../core/analysis.js'
import { formatResults } from '../utils/formatter.js'
import { loadPackageJson } from '../utils/package-loader.js'

const analyzeCommand = new Command()
  .command('analyze')
  .description('Analyze package.json for dependency bloat')
  .option('-p, --path <path>', 'Path to package.json (default: ./package.json)', './package.json')
  .option('-l, --lockfile <path>', 'Path to package-lock.json (optional)', './package-lock.json')
  .option('-v, --verbose', 'Verbose output')
  .option('-j, --json', 'Output results as JSON')
  .option('--skip-functional-overlap', 'Skip functional overlap detection')
  .option('--skip-built-in-replacements', 'Skip built-in replacement detection')
  .option('--skip-hallucination-detection', 'Skip hallucinated dependency detection')
  .action(async (options) => {
    try {
      // Load package.json
      const packageJson = await loadPackageJson(options.path)
      
      if (!packageJson) {
        console.error('Error: package.json not found at the specified path')
        process.exit(1)
      }

      // Analyze dependencies
      const results = await analyzeDependencies(packageJson, {
        lockfilePath: options.lockfile,
        verbose: options.verbose,
        checks: {
          functionalOverlap: !options.skipFunctionalOverlap,
          builtInReplacements: !options.skipBuiltInReplacements,
          hallucination: !options.skipHallucinationDetection
        }
      })

      // Output results
      if (options.json) {
        console.log(JSON.stringify(results, null, 2))
      } else {
        console.log(formatResults(results, options.verbose))
      }

      // Exit with appropriate code
      if (results.issues.length > 0) {
        process.exit(1)
      }
    } catch (error) {
      console.error('Error during analysis:', error.message)
      process.exit(1)
    }
  })

export { analyzeCommand }