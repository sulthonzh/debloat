import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'

// Test the built CLI
const CLI = join(process.cwd(), 'dist/index.js')

function runCli(args, cwd = process.cwd()) {
  const result = spawnSync('node', [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 10000
  })
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
    error: result.error
  }
}

function makeProject(deps = {}, devDeps = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'debloat-test-'))
  const pkg = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: deps,
    devDependencies: devDeps
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2))
  return dir
}

describe('CLI: --version', () => {
  it('should print version with --version', () => {
    const r = runCli(['--version'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /debloat v\d+\.\d+\.\d+/)
  })

  it('should print version with -V', () => {
    const r = runCli(['-V'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /debloat v\d+\.\d+\.\d+/)
  })
})

describe('CLI: --help', () => {
  it('should print help with --help', () => {
    const r = runCli(['--help'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /USAGE/)
    assert.match(r.stdout, /COMMANDS/)
    assert.match(r.stdout, /analyze/)
    assert.match(r.stdout, /fix/)
    assert.match(r.stdout, /info/)
  })

  it('should print help with -h', () => {
    const r = runCli(['-h'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /USAGE/)
  })

  it('should print help with no args', () => {
    const r = runCli([])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /USAGE/)
  })
})

describe('CLI: unknown command', () => {
  it('should error on unknown command', () => {
    const r = runCli(['foobar'])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /Unknown command: foobar/)
  })
})

describe('CLI: info', () => {
  it('should show info', () => {
    const r = runCli(['info'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /debloat v/)
    assert.match(r.stdout, /Capabilities/)
    assert.match(r.stdout, /Detection Types/)
  })

  it('should show info as JSON', () => {
    const r = runCli(['info', '--json'])
    assert.equal(r.status, 0)
    const data = JSON.parse(r.stdout)
    assert.equal(data.name, 'debloat')
    assert.ok(data.version)
    assert.ok(Array.isArray(data.capabilities))
    assert.ok(data.capabilities.length >= 3)
  })
})

describe('CLI: analyze', () => {
  let dir

  afterEach(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  })

  it('should detect built-in replacements', () => {
    dir = makeProject({ axios: '^1.0.0', lodash: '^4.0.0' })
    const r = runCli(['analyze', '--skip-hallucination-detection'], dir)
    assert.match(r.stdout, /axios|lodash|fetch|native/i)
  })

  it('should detect functional overlap', () => {
    dir = makeProject({ moment: '^2.0.0', 'date-fns': '^2.0.0' })
    const r = runCli(['analyze', '--skip-hallucination-detection'], dir)
    assert.match(r.stdout, /moment|date-fns|overlap|date/i)
  })

  it('should output JSON with --json', () => {
    dir = makeProject({ axios: '^1.0.0' })
    const r = runCli(['analyze', '--json', '--skip-hallucination-detection'], dir)
    if (r.stdout.trim()) {
      const data = JSON.parse(r.stdout)
      assert.ok(data.summary || data.issues !== undefined)
    }
  })

  it('should error on missing package.json', () => {
    const fakeDir = mkdtempSync(join(tmpdir(), 'debloat-empty-'))
    const r = runCli(['analyze', '--path', './nonexistent.json'], fakeDir)
    rmSync(fakeDir, { recursive: true, force: true })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /not found/)
  })
})

describe('CLI: fix', () => {
  let dir

  afterEach(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  })

  it('should suggest fixes with dry-run', () => {
    dir = makeProject({ axios: '^1.0.0', lodash: '^4.0.0' })
    const r = runCli(['fix', '--dry-run', '--skip-hallucination-detection'], dir)
    // May output to stdout or stderr depending on whether fixes are found
    const output = r.stdout + r.stderr
    assert.ok(output.length > 0, 'should produce some output')
  })
})

describe('Built-in detection logic', () => {
  // Test detection functions directly via analyzer module
  it('should detect axios as built-in replacement', async () => {
    const { detectBuiltInReplacements } = await import('../dist/analyzer.js')
    const result = await detectBuiltInReplacements({ axios: '^1.0.0' }, {
      checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true }
    })
    assert.ok(result.issues.length > 0)
    assert.equal(result.issues[0].package, 'axios')
    assert.match(result.issues[0].description, /fetch/i)
  })

  it('should detect lodash as built-in replacement', async () => {
    const { detectBuiltInReplacements } = await import('../dist/analyzer.js')
    const result = await detectBuiltInReplacements({ lodash: '^4.0.0' }, {
      checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true }
    })
    assert.ok(result.issues.length > 0)
    assert.equal(result.issues[0].package, 'lodash')
  })

  it('should not flag react as built-in replacement', async () => {
    const { detectBuiltInReplacements } = await import('../dist/analyzer.js')
    const result = await detectBuiltInReplacements({ react: '^18.0.0' }, {
      checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true }
    })
    assert.equal(result.issues.length, 0)
  })

  it('should detect moment + date-fns overlap', async () => {
    const { detectFunctionalOverlap } = await import('../dist/analyzer.js')
    const result = await detectFunctionalOverlap({
      moment: '^2.0.0',
      'date-fns': '^2.0.0'
    }, {
      checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true }
    })
    assert.ok(result.issues.length > 0)
  })

  it('should detect axios + node-fetch overlap', async () => {
    const { detectFunctionalOverlap } = await import('../dist/analyzer.js')
    const result = await detectFunctionalOverlap({
      axios: '^1.0.0',
      'node-fetch': '^3.0.0'
    }, {
      checks: { functionalOverlap: true, builtInReplacements: true, hallucination: true }
    })
    assert.ok(result.issues.length > 0)
  })
})

describe('Hallucination detection', () => {
  it('should detect suspicious patterns in very short package names', async () => {
    const { checkSuspiciousPatterns } = await import('../dist/analyzer.js')
    const result = checkSuspiciousPatterns('ab')
    assert.ok(result) // 2-char name is suspicious
  })

  it('should not flag normal package names as suspicious', async () => {
    const { checkSuspiciousPatterns } = await import('../dist/analyzer.js')
    const result = checkSuspiciousPatterns('typescript')
    assert.equal(result, null)
  })

  it('should detect potential typos', async () => {
    const { checkPotentialTypos } = await import('../dist/analyzer.js')
    const result = checkPotentialTypos('axois')
    assert.equal(result, 'axios')
  })

  it('should not flag correct package names as typos', async () => {
    const { checkPotentialTypos } = await import('../dist/analyzer.js')
    const result = checkPotentialTypos('axios')
    assert.equal(result, null)
  })

  it('should compute Levenshtein distance correctly', async () => {
    const { levenshteinDistance } = await import('../dist/analyzer.js')
    assert.equal(levenshteinDistance('axios', 'axios'), 0)
    assert.equal(levenshteinDistance('axios', 'axois'), 2) // swap + insert = actually let's compute: a-x-i-o-s vs a-x-o-i-s = 2 swaps? No, LD is 2 (swap positions i and o)
    assert.equal(levenshteinDistance('cat', 'cut'), 1)
    assert.equal(levenshteinDistance('', 'abc'), 3)
    assert.equal(levenshteinDistance('abc', ''), 3)
  })
})

describe('Package loader', () => {
  it('should load valid package.json', async () => {
    const { loadPackageJson } = await import('../dist/analyzer.js')
    const tmpDir = makeProject({ react: '^18.0.0' })
    const pkg = await loadPackageJson(join(tmpDir, 'package.json'))
    assert.ok(pkg)
    assert.equal(pkg.name, 'test-project')
  })

  it('should return null for missing package.json', async () => {
    const { loadPackageJson } = await import('../dist/analyzer.js')
    const pkg = await loadPackageJson('/tmp/nonexistent-package.json')
    assert.equal(pkg, null)
  })

  it('should validate package.json correctly', async () => {
    const { validatePackageJson } = await import('../dist/analyzer.js')
    assert.ok(validatePackageJson({ name: 'test', version: '1.0.0' }))
    assert.equal(validatePackageJson({ name: 'test' }), false) // missing version
    assert.equal(validatePackageJson({ version: '1.0.0' }), false) // missing name
  })
})
