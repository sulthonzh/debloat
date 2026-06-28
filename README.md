# 🚀 debloat - AI Dependency Bloat Detector & Fixer

[![npm version](https://badge.fury.io/js/debloat.svg)](https://badge.fury.io/js/debloat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

**debloat** helps you find and fix redundant, unnecessary, and hallucinated dependencies in AI-generated code. AI tools like Bolt, Lovable, Cursor, and Copilot routinely install 60-90 dependencies for simple apps, adding bloat that increases bundle size, security risks, and maintenance burden.

## 🎯 Why debloat?

### The Problem: AI Dependency Chaos
AI coding tools create dependency chaos:
- **Functional overlap**: `moment` + `date-fns` + `dayjs` all doing the same job
- **Built-in replacements**: `axios` when `fetch` is native, `lodash` when native methods exist
- **Hallucinated dependencies**: Packages that don't exist or are typosquats
- **Version bloat**: Multiple versions of the same package causing conflicts

### Real Impact
- **25% of developer time** spent on dependency management (GitHub Octoverse 2024)
- **49 direct + 79 transitive deps** average in npm projects (Snyk 2024)
- **AI apps routinely hit 80+ deps** for basic CRUD apps (documented cases)
- Each unnecessary dependency = attack surface + bundle bloat + maintenance burden

## ✨ What It Does

### 🔍 Detection Types
1. **Functional Overlap**: Detects packages doing the same job
   - `zustand` + `jotai` (state management)
   - `moment` + `date-fns` (date handling)
   - `axios` + `node-fetch` (HTTP requests)

2. **Built-in Replacements**: Identifies packages replaceable by native APIs
   - `axios` → `fetch` (Node.js 18+)
   - `lodash` → `Array.prototype` methods
   - `uuid` → `crypto.randomUUID()`
   - `moment` → `Intl` API

3. **Hallucination Detection**: Flags suspicious packages
   - Non-existent packages
   - Potential typosquats
   - Suspicious package names

### 🛠️ Features
- **Zero dependencies** - CLI only, runs anywhere
- **Fast analysis** - Parses package.json in milliseconds
- **Smart suggestions** - Provides safe replacement commands
- **Auto-fix mode** - Apply fixes with one command
- **JSON output** - Machine-readable results for CI/CD
- **Verbose reporting** - Detailed analysis when you need it

## 📦 Installation

```bash
npm install -g debloat
```

Or use npx:
```bash
npx debloat analyze
```

## 🚀 Usage

### Basic Analysis
```bash
debloat analyze
```

### Verbose Output
```bash
debloat analyze -v
```

### Skip Specific Checks
```bash
debloat analyze --skip-functional-overlap
debloat analyze --skip-built-in-replacements
debloat analyze --skip-hallucination-detection
```

### Auto-Fix Mode
```bash
# See what would be fixed
debloat fix --dry-run

# Apply fixes automatically
debloat fix --auto-apply

# Show detailed output
debloat fix --auto-apply -v
```

### JSON Output
```bash
debloat analyze --json
debloat fix --auto-apply --json
```

### Get Information
```bash
debloat info
debloat info --json
```

## 📊 Examples

### Before Analysis
Your package.json might look like this:
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "moment": "^2.29.0",
    "date-fns": "^2.29.0",
    "axios": "^1.0.0",
    "node-fetch": "^3.0.0",
    "lodash": "^4.17.0",
    "uuid": "^9.0.0",
    "nonexistent-pkg": "^1.0.0"
  }
}
```

### After Analysis
```bash
$ debloat analyze -v

🔍 Dependency Bloat Analysis Results
=====================================

📊 Summary:
  Total dependencies analyzed: 8
  Issues found: 6
  Suggestions: 6
  Potential savings: 370KB, 6 dependencies
  Analysis completed in: 245ms

❌ Issues Found:
  1. Multiple packages provide date-time functionality (moment@2.29.0, date-fns@2.29.0)
  2. Package can be replaced with native API: fetch (axios@1.0.0)
  3. Package can be replaced with native API: fetch (node-fetch@3.0.0)
  4. Package can be replaced with native API: native (lodash@4.17.0)
  5. Package can be replaced with native API: crypto.randomUUID() (uuid@9.0.0)
  6. Package 'nonexistent-pkg' does not exist in npm registry

💡 Suggestions:
  1. remove moment@2.29.0: Remove redundant date-time package
  2. remove axios@1.0.0: Replace with native fetch API
  3. remove node-fetch@3.0.0: Replace with native fetch API
  4. remove lodash@4.17.0: Replace with native JavaScript methods
  5. remove uuid@9.0.0: Replace with crypto.randomUUID()
  6. nonexistent-pkg: Package not found in npm registry
```

### Auto-Fix
```bash
$ debloat fix --auto-apply

✅ Successfully applied fixes to package.json
🗑️  Removed moment
🗑️  Removed axios
🗑️  Removed node-fetch
🗑️  Removed lodash
🗑️  Removed uuid
🗑️  Removed nonexistent-pkg
➕  Added Intl
```

## 🔧 Configuration

### Package.json Scripts
```json
{
  "scripts": {
    "analyze": "debloat analyze",
    "analyze:verbose": "debloat analyze -v",
    "fix": "debloat fix --auto-apply",
    "fix:dry-run": "debloat fix --dry-run",
    "lint": "eslint src --ext .ts"
  }
}
```

### CI/CD Integration
```bash
# Check in CI without failing
debloat analyze || true

# Fail CI if bloat is found
debloat analyze; exit $?
```

## 🏗️ Architecture

```
src/
├── commands/          # CLI commands
│   ├── analyze.ts     # Analysis command
│   ├── fix.ts         # Fix command
│   └── info.ts        # Info command
├── core/             # Core functionality
│   ├── analysis.ts    # Main analysis engine
│   ├── detection/     # Detection modules
│   │   ├── functional-overlap.ts
│   │   ├── built-in-replacements.ts
│   │   └── hallucinations.ts
│   ├── fixes.ts       # Fix generation
│   ├── fix-codegen.ts # Code generation
│   └── fix-apply.ts   # Fix application
├── types/             # TypeScript definitions
└── utils/            # Utility functions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by real-world dependency bloat issues in AI-generated code
- Thanks to the VibeDoctor DEP-001 analysis and community research
- Built with ❤️ for the JavaScript ecosystem

## 💡 Real-World Examples

### 1. Clean up an AI-generated CRUD app

A team used Bolt.new to build a Next.js app. The result: 87 dependencies for a simple user auth + data grid.

```bash
$ debloat analyze
📊 Total dependencies: 87
❌ Issues found: 23
💡 Potential savings: 2.3MB, 18 dependencies

$ debloat fix --auto-apply
✅ Applied 18 fixes. Dependencies: 87 → 69 (21% reduction)
```

### 2. Fix hallucinated dependencies in AI codebase

Copilot suggested a non-existent package `@xyz/data-grid-v2`.

```bash
$ debloat analyze --json | jq '.issues[] | select(.type == "hallucination")'
{
  "type": "hallucination",
  "package": "@xyz/data-grid-v2",
  "reason": "Package not found in npm registry"
}

$ debloat fix --dry-run
🔍 Suggested fixes:
  - Remove @xyz/data-grid-v2: Package not found in npm registry
```

### 3. Pre-commit hook for CI/CD quality gate

Prevent bloat from entering your codebase:

```bash
# .husky/pre-commit
npx debloat analyze || {
  echo "❌ Dependency bloat detected. Fix before committing."
  exit 1
}
```

### CI/CD Integration
```bash
# Check in CI without failing
debloat analyze || true

# Fail CI if bloat is found
debloat analyze; exit $?
```

## 📊 Comparison with Alternatives

| Feature | debloat | npm-check-updates | depcheck | npm ls | Bundlephobia |
|---------|---------|-------------------|----------|---------|--------------|
| **Detect functional overlap** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Suggest native replacements** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Detect hallucinated packages** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Auto-fix package.json** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Generate code patches** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Zero runtime dependencies** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **TypeScript types included** | ✅ | ✅ | ✅ | N/A | ❌ |
| **JSON output for CI** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Bundle size reporting** | ❌ | ❌ | ❌ | ❌ | ✅ |

**Why debloat?**
- AI-generated code often includes redundant or hallucinated packages that traditional tools don't catch.
- Native replacement suggestions (axios→fetch, moment→Intl) go beyond just checking for unused deps.
- Code patch generation helps you update imports, not just package.json.

## 🚨 Security

debloat only reads your package.json and package-lock.json files. It never modifies your code directly and only makes changes when explicitly requested with `--auto-apply`.

---

**debloat** - Because your app shouldn't carry what it doesn't need. 🎯