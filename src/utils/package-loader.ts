import { readFileSync } from 'fs'
import { join } from 'path'
import { PackageJson, LockFile } from '../types/package-json.js'

export async function loadPackageJson(path: string): Promise<PackageJson | null> {
  try {
    const content = readFileSync(path, 'utf8')
    return JSON.parse(content) as PackageJson
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export async function loadLockFile(path: string): Promise<LockFile | null> {
  try {
    const content = readFileSync(path, 'utf8')
    return JSON.parse(content) as LockFile
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

export function getDefaultPackageJsonPath(): string {
  return join(process.cwd(), 'package.json')
}

export function getDefaultLockFilePath(): string {
  return join(process.cwd(), 'package-lock.json')
}

export function validatePackageJson(packageJson: PackageJson): boolean {
  if (!packageJson.name || typeof packageJson.name !== 'string') {
    return false
  }
  
  if (!packageJson.version || typeof packageJson.version !== 'string') {
    return false
  }
  
  // Validate dependencies structure
  const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
  
  for (const field of dependencyFields) {
    const deps = packageJson[field as keyof PackageJson]
    if (deps && typeof deps === 'object') {
      for (const [name, version] of Object.entries(deps)) {
        if (typeof name !== 'string' || typeof version !== 'string') {
          return false
        }
      }
    }
  }
  
  return true
}