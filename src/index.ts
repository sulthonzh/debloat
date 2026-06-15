#!/usr/bin/env node

import { program } from 'commander'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import commands
import { analyzeCommand } from './commands/analyze.js'
import { fixCommand } from './commands/fix.js'
import { infoCommand } from './commands/info.js'

// Load package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'))

program
  .name('debloat')
  .description('AI Dependency Bloat Detector & Fixer - Find and fix redundant, unnecessary, and hallucinated dependencies')
  .version(packageJson.version)

// Add commands
program.addCommand(analyzeCommand)
program.addCommand(fixCommand)
program.addCommand(infoCommand)

// Parse arguments
program.parse()