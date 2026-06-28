import { describe, it, expect } from 'vitest'
import { loadPackageJson, loadLockFile, getDefaultPackageJsonPath, getDefaultLockFilePath, validatePackageJson } from '../src/utils/package-loader.js'
import { writeFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('loadPackageJson', () => {
  it('should load a valid package.json', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'loader-test-'))
    const pkgPath = join(dir, 'package.json')
    writeFileSync(pkgPath, JSON.stringify({ name: 'test', version: '1.0.0' }))
    const result = await loadPackageJson(pkgPath)
    expect(result).not.toBeNull()
    expect(result?.name).toBe('test')
    expect(result?.version).toBe('1.0.0')
    rmSync(dir, { recursive: true, force: true })
  })

  it('should return null for missing file', async () => {
    const result = await loadPackageJson('/tmp/nonexistent-xyz-123.json')
    expect(result).toBeNull()
  })

  it('should throw for invalid JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'loader-test-'))
    const pkgPath = join(dir, 'package.json')
    writeFileSync(pkgPath, '{ invalid json }')
    await expect(loadPackageJson(pkgPath)).rejects.toThrow()
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('loadLockFile', () => {
  it('should load a valid lock file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'loader-test-'))
    const lockPath = join(dir, 'package-lock.json')
    writeFileSync(lockPath, JSON.stringify({ lockfileVersion: 3, packages: {} }))
    const result = await loadLockFile(lockPath)
    expect(result).not.toBeNull()
    expect(result?.lockfileVersion).toBe(3)
    rmSync(dir, { recursive: true, force: true })
  })

  it('should return null for missing lock file', async () => {
    const result = await loadLockFile('/tmp/nonexistent-lock-123.json')
    expect(result).toBeNull()
  })
})

describe('getDefaultPackageJsonPath', () => {
  it('should return path ending with package.json', () => {
    const result = getDefaultPackageJsonPath()
    expect(result).toContain('package.json')
  })
})

describe('getDefaultLockFilePath', () => {
  it('should return path ending with package-lock.json', () => {
    const result = getDefaultLockFilePath()
    expect(result).toContain('package-lock.json')
  })
})

describe('validatePackageJson', () => {
  it('should accept valid package.json with name and version', () => {
    expect(validatePackageJson({ name: 'test', version: '1.0.0' })).toBe(true)
  })

  it('should reject missing name', () => {
    expect(validatePackageJson({ version: '1.0.0' } as never)).toBe(false)
  })

  it('should reject missing version', () => {
    expect(validatePackageJson({ name: 'test' } as never)).toBe(false)
  })

  it('should reject non-string name', () => {
    expect(validatePackageJson({ name: 123, version: '1.0.0' } as never)).toBe(false)
  })

  it('should reject non-string version', () => {
    expect(validatePackageJson({ name: 'test', version: 123 } as never)).toBe(false)
  })

  it('should accept valid dependencies structure', () => {
    expect(validatePackageJson({
      name: 'test', version: '1.0.0',
      dependencies: { lodash: '^4.0.0' },
    })).toBe(true)
  })

  it('should accept valid devDependencies', () => {
    expect(validatePackageJson({
      name: 'test', version: '1.0.0',
      devDependencies: { typescript: '^5.0.0' },
    })).toBe(true)
  })

  it('should accept peerDependencies', () => {
    expect(validatePackageJson({
      name: 'test', version: '1.0.0',
      peerDependencies: { react: '^18.0.0' },
    })).toBe(true)
  })

  it('should accept optionalDependencies', () => {
    expect(validatePackageJson({
      name: 'test', version: '1.0.0',
      optionalDependencies: { fsevents: '^2.0.0' },
    })).toBe(true)
  })
})
