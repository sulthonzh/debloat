import { describe, it, expect } from 'vitest'
import { DependencyUtils } from '../src/utils/dependency-utils.js'

describe('DependencyUtils', () => {
  describe('categorizePackage', () => {
    it('should categorize React as framework', () => {
      expect(DependencyUtils.categorizePackage('react')).toBe('framework')
    })

    it('should categorize Lodash as library', () => {
      expect(DependencyUtils.categorizePackage('lodash')).toBe('library')
    })

    it('should categorize unknown packages as other', () => {
      expect(DependencyUtils.categorizePackage('unknown-pkg')).toBe('other')
    })
  })

  describe('getAllDependencies', () => {
    const mockPackageJson = {
      name: 'test',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        lodash: '^4.17.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0'
      }
    }

    it('should combine all dependencies', () => {
      const deps = DependencyUtils.getAllDependencies(mockPackageJson)
      expect(deps).toEqual({
        react: '^18.0.0',
        lodash: '^4.17.0',
        '@types/node': '^20.0.0'
      })
    })
  })
})