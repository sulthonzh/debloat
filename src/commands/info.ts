import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

type CliOpts = Record<string, string | boolean>

export const infoCommand = {
  name: 'info' as const,
  description: 'Show information about debloat and its capabilities',
  async run(opts: CliOpts) {
    try {
      const packageJsonPath = join(__dirname, '../package.json')
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

      const info = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        capabilities: [
          'Detect functional overlap between dependencies (e.g., moment + date-fns)',
          'Identify built-in replacements (e.g., axios → fetch, lodash → native)',
          'Find hallucinated or typosquatting dependencies',
          'Generate migration patches for safe replacements',
          'Auto-fix mode with safe suggestions'
        ],
        detectionTypes: [
          'Functional Overlap: Detects packages that do the same job',
          'Built-in Replacements: Identifies packages replaceable by native APIs',
          'Hallucination Detection: Flags packages that don\'t exist or look like typosquats'
        ],
        usage: [
          'debloat analyze - Analyze package.json for bloat',
          'debloat fix --auto-apply - Generate and apply fixes',
          'debloat info - Show tool information'
        ],
        examples: [
          'debloat analyze -v',
          'debloat analyze --skip-functional-overlap',
          'debloat fix --dry-run',
          'debloat fix --auto-apply --json'
        ]
      }

      if (opts.json) {
        console.log(JSON.stringify(info, null, 2))
      } else {
        console.log(`🔍 ${info.name} v${info.version}`)
        console.log(`${info.description}\n`)
        
        console.log('🎯 Capabilities:')
        info.capabilities.forEach(cap => console.log(`  • ${cap}`))
        
        console.log('\n📋 Detection Types:')
        info.detectionTypes.forEach(type => console.log(`  • ${type}`))
        
        console.log('\n💡 Usage:')
        info.usage.forEach(use => console.log(`  ${use}`))
        
        console.log('\n📝 Examples:')
        info.examples.forEach(ex => console.log(`  ${ex}`))
      }
    } catch (error) {
      console.error('Error loading info:', (error as Error).message)
      process.exit(1)
    }
  }
}
