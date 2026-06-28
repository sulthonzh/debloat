import { describe, it, expect } from 'vitest'
import { DependencyUtils } from '../src/utils/dependency-utils.js'
import type { PackageJson } from '../src/types/package-json.js'

describe('DependencyUtils.getAllDependencies', () => {
  it('should combine all dependency types', () => {
    const pkg: PackageJson = {
      name: 'test', version: '1.0.0',
      dependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      peerDependencies: { zustand: '^4.0.0' },
      optionalDependencies: { fsevents: '^2.0.0' },
    }
    const deps = DependencyUtils.getAllDependencies(pkg)
    expect(deps).toEqual({
      react: '^18.0.0',
      typescript: '^5.0.0',
      zustand: '^4.0.0',
      fsevents: '^2.0.0',
    })
  })

  it('should handle only dependencies', () => {
    const pkg: PackageJson = {
      name: 'test', version: '1.0.0',
      dependencies: { lodash: '^4.0.0' },
    }
    const deps = DependencyUtils.getAllDependencies(pkg)
    expect(deps).toEqual({ lodash: '^4.0.0' })
  })

  it('should handle empty package.json', () => {
    const deps = DependencyUtils.getAllDependencies({ name: 't', version: '1' })
    expect(deps).toEqual({})
  })
})

describe('DependencyUtils.getDependenciesByCategory', () => {
  it('should categorize packages', () => {
    const pkg: PackageJson = {
      name: 'test', version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        lodash: '^4.0.0',
        jest: '^29.0.0',
        eslint: '^8.0.0',
      },
    }
    const cats = DependencyUtils.getDependenciesByCategory(pkg)
    expect(cats.framework).toContain('react@^18.0.0')
    expect(cats.library).toContain('lodash@^4.0.0')
    expect(cats.testing).toContain('jest@^29.0.0')
    expect(cats.linting).toContain('eslint@^8.0.0')
  })

  it('should put unknown packages in "other"', () => {
    const pkg: PackageJson = {
      name: 'test', version: '1.0.0',
      dependencies: { 'random-unknown': '^1.0.0' },
    }
    const cats = DependencyUtils.getDependenciesByCategory(pkg)
    expect(cats.other).toContain('random-unknown@^1.0.0')
  })
})

describe('DependencyUtils.categorizePackage', () => {
  it('should categorize frameworks', () => {
    expect(DependencyUtils.categorizePackage('react')).toBe('framework')
    expect(DependencyUtils.categorizePackage('vue')).toBe('framework')
    expect(DependencyUtils.categorizePackage('svelte')).toBe('framework')
    expect(DependencyUtils.categorizePackage('angular')).toBe('framework')
  })

  it('should categorize libraries', () => {
    expect(DependencyUtils.categorizePackage('lodash')).toBe('library')
    expect(DependencyUtils.categorizePackage('axios')).toBe('library')
    expect(DependencyUtils.categorizePackage('moment')).toBe('library')
  })

  it('should categorize build tools', () => {
    expect(DependencyUtils.categorizePackage('webpack')).toBe('build')
    expect(DependencyUtils.categorizePackage('vite')).toBe('build')
    expect(DependencyUtils.categorizePackage('babel')).toBe('build')
  })

  it('should categorize testing', () => {
    expect(DependencyUtils.categorizePackage('jest')).toBe('testing')
    expect(DependencyUtils.categorizePackage('mocha')).toBe('testing')
    expect(DependencyUtils.categorizePackage('vitest')).toBe('testing')
  })

  it('should categorize linting', () => {
    expect(DependencyUtils.categorizePackage('eslint')).toBe('linting')
    expect(DependencyUtils.categorizePackage('prettier')).toBe('linting')
  })

  it('should categorize types', () => {
    expect(DependencyUtils.categorizePackage('typescript')).toBe('types')
    expect(DependencyUtils.categorizePackage('@types/node')).toBe('types')
    expect(DependencyUtils.categorizePackage('@types/react')).toBe('types')
  })

  it('should return "other" for unknown', () => {
    expect(DependencyUtils.categorizePackage('unknown-xyz')).toBe('other')
  })
})

describe('DependencyUtils.estimateDependencySize', () => {
  it('should return known sizes for common packages', () => {
    expect(DependencyUtils.estimateDependencySize('react')).toBe(40)
    expect(DependencyUtils.estimateDependencySize('lodash')).toBe(70)
    expect(DependencyUtils.estimateDependencySize('moment')).toBe(220)
    expect(DependencyUtils.estimateDependencySize('webpack')).toBe(800)
  })

  it('should return default 50 for unknown packages', () => {
    expect(DependencyUtils.estimateDependencySize('unknown-pkg')).toBe(50)
  })
})

describe('DependencyUtils.isDeprecated', () => {
  it('should return false (stub)', () => {
    expect(DependencyUtils.isDeprecated('anything')).toBe(false)
  })
})

describe('DependencyUtils.getLicense', () => {
  it('should return MIT (stub)', () => {
    expect(DependencyUtils.getLicense('anything')).toBe('MIT')
  })
})
