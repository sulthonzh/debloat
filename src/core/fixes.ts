import { DependencyUtils } from '../utils/dependency-utils.js'
import { AnalysisResult } from '../types/analysis.js'
import { DependencySuggestion, SuggestionAction } from '../types/dependency-issues.js'
import { generateFixCode } from './fix-codegen.js'

export async function generateFixes(
  packageJson: any,
  analysisResult: AnalysisResult
): Promise<AnalysisResult> {
  const fixes = { ...analysisResult }
  
  // Generate code patches for each suggestion
  for (const suggestion of fixes.suggestions) {
    const fixCode = await generateFixCode(suggestion, packageJson)
    suggestion.action.commands = [
      ...suggestion.action.commands || [],
      ...fixCode.commands || []
    ]
  }
  
  return fixes
}

export async function applyFixes(
  packageJson: any,
  fixes: AnalysisResult,
  packageJsonPath: string
): Promise<boolean> {
  try {
    // Create a copy of the package JSON to modify
    const updatedPackageJson = { ...packageJson }
    
    // Apply each fix
    for (const suggestion of fixes.suggestions) {
      const action = suggestion.action
      
      switch (action.type) {
        case 'remove':
          if (updatedPackageJson.dependencies?.[action.package]) {
            delete updatedPackageJson.dependencies[action.package]
            console.log(`🗑️  Removed ${action.package}`)
          }
          if (updatedPackageJson.devDependencies?.[action.package]) {
            delete updatedPackageJson.devDependencies[action.package]
            console.log(`🗑️  Removed ${action.package} from devDependencies`)
          }
          break
          
        case 'replace':
          // Remove old package
          if (updatedPackageJson.dependencies?.[action.package]) {
            delete updatedPackageJson.dependencies[action.package]
            console.log(`🗑️  Removed ${action.package}`)
          }
          if (updatedPackageJson.devDependencies?.[action.package]) {
            delete updatedPackageJson.devDependencies[action.package]
            console.log(`🗑️  Removed ${action.package} from devDependencies`)
          }
          
          // Add new package if specified
          if (action.replacement) {
            if (!updatedPackageJson.dependencies) {
              updatedPackageJson.dependencies = {}
            }
            updatedPackageJson.dependencies[action.replacement] = action.version || 'latest'
            console.log(`➕  Added ${action.replacement}`)
          }
          break
          
        case 'upgrade':
        case 'downgrade':
          if (updatedPackageJson.dependencies?.[action.package]) {
            updatedPackageJson.dependencies[action.package] = action.version || 'latest'
            console.log(`📈  Updated ${action.package} to ${action.version || 'latest'}`)
          }
          if (updatedPackageJson.devDependencies?.[action.package]) {
            updatedPackageJson.devDependencies[action.package] = action.version || 'latest'
            console.log(`📈  Updated ${action.package} in devDependencies to ${action.version || 'latest'}`)
          }
          break
      }
    }
    
    // Write the updated package.json
    const fs = await import('fs')
    const path = await import('path')
    
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(updatedPackageJson, null, 2) + '\n'
    )
    
    return true
  } catch (error) {
    console.error('Error applying fixes:', error)
    return false
  }
}