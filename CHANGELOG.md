# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial version of debloat
- AI dependency bloat detection
- Functional overlap detection
- Built-in replacement detection  
- Hallucination detection
- CLI interface with analyze, fix, and info commands
- Auto-fix mode with safe suggestions
- JSON output support
- Verbose reporting
- Comprehensive test suite

### Features
- **Functional Overlap**: Detects packages doing the same job (e.g., moment + date-fns)
- **Built-in Replacements**: Identifies packages replaceable by native APIs (e.g., axios → fetch)
- **Hallucination Detection**: Flags non-existent packages and potential typosquats
- **Auto-Fix**: Generate and apply fixes with one command
- **Zero Dependencies**: CLI-only tool, runs anywhere
- **Fast Analysis**: Parses package.json in milliseconds
- **Smart Suggestions**: Provides safe replacement commands

### CLI Commands
- `debloat analyze` - Analyze package.json for bloat
- `debloat fix --auto-apply` - Generate and apply fixes
- `debloat info` - Show tool information
- `debloat analyze --json` - JSON output
- `debloat fix --dry-run` - Show what would be fixed

## [1.0.0] - 2026-06-15

### Added
- Initial release
- Core detection engine
- Three detection types
- CLI interface
- Comprehensive documentation
- Test suite