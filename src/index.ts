#!/usr/bin/env node

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Import commands
import { analyzeCommand } from './commands/analyze.js'
import { fixCommand } from './commands/fix.js'
import { infoCommand } from './commands/info.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

type CliOpts = Record<string, string | boolean>

const commands = [analyzeCommand, fixCommand, infoCommand]

// --- Minimal zero-dep CLI parser ---

function parseArgs(argv: string[]): { args: string[]; opts: CliOpts } {
  const args: string[] = []
  const opts: CliOpts = {}
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      // Check for --key=value
      if (key.includes('=')) {
        const [k, ...v] = key.split('=')
        opts[k] = v.join('=')
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        opts[key] = argv[i + 1]
        i++
      } else {
        opts[key] = true
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flags
      const flag = arg.slice(1)
      if (flag === 'v') opts['verbose'] = true
      else if (flag === 'j') opts['json'] = true
      else if (flag === 'h') opts['help'] = true
      else if (flag === 'V') opts['version'] = true
      else if (flag.length === 1 && i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        if (flag === 'p') { opts['path'] = argv[i + 1]; i++ }
        else if (flag === 'l') { opts['lockfile'] = argv[i + 1]; i++ }
        else if (flag === 'a') { opts['autoApply'] = true }
        else opts[flag] = true
      } else {
        opts[flag] = true
      }
    } else {
      args.push(arg)
    }
    i++
  }
  return { args, opts }
}

function printHelp(): void {
  console.log(`
🔍 debloat v${packageJson.version}
${packageJson.description}

USAGE
  debloat <command> [options]

COMMANDS
  analyze    Analyze package.json for dependency bloat
  fix        Generate and apply fixes for dependency bloat
  info       Show information about debloat and its capabilities

OPTIONS
  -V, --version   Show version
  -h, --help      Show help

EXAMPLES
  debloat analyze               Analyze current project
  debloat analyze -v            Verbose output
  debloat analyze --json        Output as JSON
  debloat fix --dry-run         Preview fixes
  debloat fix --auto-apply      Apply fixes
  debloat info                  Show tool info
`)
}

function printVersion(): void {
  console.log(`debloat v${packageJson.version}`)
}

// --- Main ---

const { args, opts } = parseArgs(process.argv.slice(2))

if (opts['version'] || opts['V']) {
  printVersion()
  process.exit(0)
}

if (opts['help'] || opts['h'] || args.length === 0) {
  printHelp()
  process.exit(0)
}

const commandName = args[0]
const command = commands.find(c => c.name === commandName)

if (!command) {
  console.error(`Unknown command: ${commandName}`)
  printHelp()
  process.exit(1)
}

// Parse remaining args for the subcommand
const subArgv = process.argv.slice(process.argv.indexOf(commandName) + 1)
const { opts: subOpts } = parseArgs(subArgv)

command.run(subOpts)
