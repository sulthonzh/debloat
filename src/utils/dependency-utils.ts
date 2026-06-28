import { PackageJson } from '../types/package-json.js'

export class DependencyUtils {
  static getAllDependencies(packageJson: PackageJson): Record<string, string> {
    const dependencies: Record<string, string> = {}
    
    // Add regular dependencies
    if (packageJson.dependencies) {
      Object.assign(dependencies, packageJson.dependencies)
    }
    
    // Add dev dependencies
    if (packageJson.devDependencies) {
      Object.assign(dependencies, packageJson.devDependencies)
    }
    
    // Add peer dependencies
    if (packageJson.peerDependencies) {
      Object.assign(dependencies, packageJson.peerDependencies)
    }
    
    // Add optional dependencies
    if (packageJson.optionalDependencies) {
      Object.assign(dependencies, packageJson.optionalDependencies)
    }
    
    return dependencies
  }
  
  static getDependenciesByCategory(packageJson: PackageJson): Record<string, string[]> {
    const allDeps = this.getAllDependencies(packageJson)
    const categories: Record<string, string[]> = {}
    
    // Basic categorization - could be expanded with more sophisticated analysis
    Object.entries(allDeps).forEach(([pkg, version]) => {
      const category = this.categorizePackage(pkg)
      
      if (!categories[category]) {
        categories[category] = []
      }
      
      categories[category].push(`${pkg}@${version}`)
    })
    
    return categories
  }
  
  static categorizePackage(pkgName: string): string {
    const categories = {
      'framework': ['react', 'vue', 'angular', 'svelte', 'lit', 'preact', 'solid'],
      'library': ['lodash', 'axios', 'moment', 'date-fns', 'dayjs'],
      'testing': ['jest', 'mocha', 'cypress', 'playwright', 'vitest'],
      'build': ['webpack', 'vite', 'rollup', 'babel', 'esbuild'],
      'linting': ['eslint', 'prettier', 'stylelint'],
      'types': ['typescript', '@types/node', '@types/react'],
      'database': ['mongoose', 'sequelize', 'prisma', 'firebase'],
      'auth': ['passport', 'bcrypt', 'jsonwebtoken', 'next-auth'],
      'ui': ['material-ui', 'chakra-ui', 'tailwindcss', 'bootstrap'],
      'state': ['redux', 'recoil', 'zustand', 'jotai', 'mobx'],
      'api': ['express', 'fastify', 'koa', 'hapi'],
      'utils': ['chalk', 'inquirer', 'commander', 'fs-extra']
    }
    
    for (const [category, packages] of Object.entries(categories)) {
      if (packages.some(p => pkgName.startsWith(p))) {
        return category
      }
    }
    
    return 'other'
  }
  
  static estimateDependencySize(pkgName: string): number {
    // Rough size estimates based on package type
    const sizeMap: Record<string, number> = {
      'react': 40,
      'vue': 30,
      'angular': 150,
      'lodash': 70,
      'axios': 80,
      'moment': 220,
      'webpack': 800,
      'babel': 200,
      'typescript': 100,
      'eslint': 30,
      'prettier': 20,
      'jest': 80,
      'mocha': 40,
      'express': 40,
      'mongoose': 100,
      'react-dom': 40,
      'next': 500,
      'node': 500
    }
    
    return sizeMap[pkgName] || 50 // default 50KB
  }
  
  static isDeprecated(_pkgName: string): boolean {
    // In a real implementation, this would check npm registry
    // For now, return false
    return false
  }
  
  static getLicense(_pkgName: string): string {
    // In a real implementation, this would check npm registry
    // For now, return MIT as default
    return 'MIT'
  }
}