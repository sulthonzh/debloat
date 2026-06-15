export interface PatchFile {
  file: string
  operations: PatchOperation[]
}

export interface PatchOperation {
  type: 'replace' | 'insert' | 'delete'
  pattern?: RegExp | string
  replacement?: string
  content?: string
  insertAt?: 'beginning' | 'end'
}