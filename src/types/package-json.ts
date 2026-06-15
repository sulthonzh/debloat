export interface PackageJson {
  name: string
  version: string
  description?: string
  main?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  bundledDependencies?: string[]
  bundleDependencies?: string[]
  workspaces?: string[] | object
  engines?: Record<string, string>
  private?: boolean
  [key: string]: any
}

export interface LockFile {
  name: string
  version: string
  lockfileVersion: number
  requires?: boolean
  packages?: {
    [name: string]: {
      version: string
      resolved?: string
      integrity?: string
      link?: boolean
      dev?: boolean
      optional?: boolean
      [key: string]: any
    }
  }
  dependencies?: {
    [name: string]: {
      version: string
      resolved?: string
      integrity?: string
      [key: string]: any
    }
  }
}