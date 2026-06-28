import { DependencySuggestion, SuggestionAction } from '../types/dependency-issues.js'
import type { PackageJson } from '../types/package-json.js'

export async function generateFixCode(
  suggestion: DependencySuggestion,
  packageJson: PackageJson
): Promise<{ commands: string[]; patches?: Record<string, unknown>[] }> {
  const commands: string[] = []
  const patches: Record<string, unknown>[] = []
  
  const action = suggestion.action
  const pkgName = action.package
  
  // Generate commands based on action type
  switch (action.type) {
    case 'remove':
      commands.push(`npm uninstall ${pkgName}`)
      if (packageJson.devDependencies?.[pkgName]) {
        commands.push(`npm uninstall ${pkgName} --save-dev`)
      }
      break
      
    case 'replace':
      // Remove old package
      commands.push(`npm uninstall ${pkgName}`)
      if (packageJson.devDependencies?.[pkgName]) {
        commands.push(`npm uninstall ${pkgName} --save-dev`)
      }
      
      // Add new package
      if (action.replacement) {
        commands.push(`npm install ${action.replacement}${action.version ? `@${action.version}` : ''}`)
        if (packageJson.devDependencies?.[pkgName]) {
          commands.push(`npm install ${action.replacement}${action.version ? `@${action.version}` : ''} --save-dev`)
        }
      }
      break
      
    case 'upgrade':
    case 'downgrade':
      commands.push(`npm install ${pkgName}${action.version ? `@${action.version}` : ''}`)
      if (packageJson.devDependencies?.[pkgName]) {
        commands.push(`npm install ${pkgName}${action.version ? `@${action.version}` : ''} --save-dev`)
      }
      break
  }
  
  // Generate code patches for common replacements
  const codePatches = await generateCodePatches(action)
  if (codePatches.length > 0) {
    patches.push(...codePatches)
  }
  
  return { commands, patches: patches.length > 0 ? patches : undefined }
}

async function generateCodePatches(action: SuggestionAction): Promise<Record<string, unknown>[]> {
  const patches: Record<string, unknown>[] = []
  
  switch (action.package) {
    case 'axios':
      if (action.replacement === 'fetch') {
        patches.push({
          type: 'import',
          pattern: /import.*axios.*from.*['"]axios['"]/g,
          replacement: "// Using native fetch API instead of axios"
        })
        patches.push({
          type: 'function',
          pattern: /axios\(/g,
          replacement: 'fetch('
        })
        patches.push({
          type: 'response',
          pattern: /\.then\(response => response\.json\(\)\)/g,
          replacement: '.then(response => response)'
        })
      }
      break
      
    case 'lodash':
      patches.push({
        type: 'import',
        pattern: /import.*lodash.*from.*['"]lodash['"]/g,
        replacement: "// Using native JavaScript instead of lodash"
      })
      patches.push({
        type: 'function',
        pattern: /lodash\./g,
        replacement: 'Array.prototype.'
      })
      break
      
    case 'moment':
      patches.push({
        type: 'import',
        pattern: /import.*moment.*from.*['"]moment['"]/g,
        replacement: "// Using native Intl API instead of moment"
      })
      patches.push({
        type: 'function',
        pattern: /moment\(/g,
        replacement: 'new Date('
      })
      break
      
    case 'uuid':
      patches.push({
        type: 'import',
        pattern: /import.*uuid.*from.*['"]uuid['"]/g,
        replacement: "// Using native crypto.randomUUID instead of uuid"
      })
      patches.push({
        type: 'function',
        pattern: /uuid\(\)/g,
        replacement: 'crypto.randomUUID()'
      })
      break
  }
  
  return patches
}