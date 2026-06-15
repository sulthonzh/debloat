import { Command } from 'commander'
import { generateFixes } from '../core/fixes.js'
import { applyFixes } from '../core/fix-apply.js'
import { loadPackageJson } from '../utils/package-loader.js'
import { formatResults } from '../utils/formatter.js'

const fixCommand = new Command()
  .command('fix')
  .description('Generate and apply fixes for dependency bloat')
  .option('-p, --path <path>', 'Path to package.json (default: ./package.json)', './package.json')
  .option('-l, --lockfile <path>', 'Path to package-lock.json (optional)', './package-lock.json')
  .option('-a, --auto-apply', 'Automatically apply suggested fixes')
  .option('-v, --verbose', 'Verbose output')
  .option('-j, --json', 'Output results as JSON')
  .option('--dry-run', 'Show what would be fixed without applying changes')
  .action(async (options) => {
    try {
      // Load package.json
      const packageJson = await loadPackageJson(options.path)
      
      if (!packageJson) {
        console.error('Error: package.json not found at the specified path')
        process.exit(1)
      }

      // Generate fixes
      const fixes = await generateFixes(packageJson, {
        lockfilePath: options.lockfile,
        verbose: options.verbose
      })

      // Handle dry run
      if (options.dryRun) {
        const dryRunResults = {
          ...fixes,
          summary: {
            ...fixes.summary,
            message: 'DRY RUN: No changes applied'
          }
        }
        
        if (options.json) {
          console.log(JSON.stringify(dryRunResults, null, 2))
        } else {
          console.log(formatResults(dryRunResults, options.verbose))
          console.log('\nDRY RUN: No changes were made to package.json')
        }
        return
      }

      // Apply fixes if requested
      if (options.autoApply) {
        const applied = await applyFixes(packageJson, fixes, options.path)
        
        if (applied) {
          console.log('✅ Successfully applied fixes to package.json')
          if (!options.json) {
            console.log(formatResults(fixes, options.verbose))
          }
        } else {
          console.error('❌ Failed to apply fixes')
          process.exit(1)
        }
      } else {
        // Show fixes without applying
        if (options.json) {
          console.log(JSON.stringify(fixes, null, 2))
        } else {
          console.log('🔍 Suggested fixes:')
          console.log(formatResults(fixes, options.verbose))
          console.log('\nTo apply these fixes, use --auto-apply or run:')
          console.log('  debloat fix --auto-apply')
        }
      }
    } catch (error) {
      console.error('Error during fix generation:', error.message)
      process.exit(1)
    }
  })

export { fixCommand }