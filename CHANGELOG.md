# Changelog

All notable changes to the "Doit Code" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-05-10

### ✨ Added

- **Intelligent Task Validation System**: Automatic periodic validation to check if tasks still exist in code files
- **Similarity-Based Task Matching**: Smart algorithm to detect when tasks are modified vs when they're completely new
- **Configurable Validation Interval**: New `doitCode.validationInterval` setting to control validation frequency (default: 30 seconds)
- **Auto-Complete Behavior**: New `doitCode.autoComplete` setting to choose between marking tasks as completed or deleting them when removed from code
- **Similarity Threshold Configuration**: New `doitCode.similarityThreshold` setting to fine-tune task matching sensitivity (default: 0.5)
- **File Content Caching**: 5-second cache to reduce unnecessary file parsing and improve performance
- **Batch Processing**: Process files in batches of 10 to prevent UI blocking in large projects
- **Concurrent Validation Prevention**: Flag system to prevent multiple validations running simultaneously

### 🚀 Performance Improvements

- **Optimized File Scanning**: Parallel processing of file validations using `Promise.all()`
- **Smart Cache Invalidation**: Automatic cache cleanup when files are saved or deleted
- **Reduced Memory Usage**: Better memory management for large workspaces
- **Non-blocking Operations**: Small pauses between batch processing to keep UI responsive

### 🔧 Enhanced Features

- **Better Multiple TODO Handling**: Improved logic for files containing multiple TODO comments
- **Intelligent Task Matching**: Best-match algorithm selects the most similar task when updating
- **File Change Detection**: Watches for file deletions and updates cache accordingly
- **Improved Task Grouping**: Tasks are now grouped by file for more efficient processing

### 📊 Better Notifications

- **Detailed Change Messages**: Shows specific counts for new, updated, and completed/removed tasks
- **Action-Based Messages**: Different notifications for auto-complete vs delete actions
- **Reduced Notification Spam**: Only shows messages when actual changes occur

### 🐛 Bug Fixes

- Fixed issue where multiple TODOs in same file would incorrectly mark tasks as completed
- Fixed task duplication when modifying TODO text
- Fixed race condition in concurrent file scanning
- Fixed cache not being cleared on workspace rescan
- Improved handling of deleted files in validation process

### 🔄 Changed

- Validation now runs 5 seconds after startup instead of immediately
- Tasks are validated only if they have source files and aren't completed
- Updated task matching to prefer exact ID matches before similarity checks
- Improved error handling for file read failures

### 📝 Documentation

- Updated README with comprehensive configuration guide
- Added examples for all new settings
- Included troubleshooting section for common issues
- Added task lifecycle documentation

## [1.0.1] - 2025-09-20

### ✨ Initial Release

- **Automatic TODO Detection**: Scans workspace for TODO, FIXME, HACK, NOTE, and BUG comments
- **Manual Task Management**: Create, edit, complete, and delete tasks manually
- **File Integration**: Direct navigation to TODO comments in source files
- **Smart Exclusions**: Automatically excludes common folders (node_modules, dist, etc.)
- **Multiple File Types**: Support for 20+ programming languages and file types
- **Persistent Storage**: Tasks saved across VS Code sessions
- **Real-time Updates**: Automatic rescanning when files change
- **Configurable Settings**: Customize exclusion patterns, file size limits, and supported file types
- **Context Menu Actions**: Right-click operations on tasks
- **Tree View Interface**: Clean, organized task display in Explorer sidebar

### 🎯 Supported Languages

- JavaScript/TypeScript (.js, .ts, .jsx, .tsx)
- Python (.py)
- Java (.java)
- C/C++ (.c, .cpp, .h)
- C# (.cs)
- PHP (.php)
- Go (.go)
- Rust (.rs)
- HTML (.html)
- CSS/SCSS (.css, .scss)
- SQL (.sql)
- Markdown (.md)
- Text files (.txt)
- Vue (.vue)
- Svelte (.svelte)
- Ruby (.rb)
- Swift (.swift)
- Kotlin (.kt)
- Scala (.scala)
- Clojure (.clj)
- YAML (.yml, .yaml)
- JSON (.json)

### ⚙️ Initial Configuration Options

- `doitCode.excludePatterns`: Custom exclusion patterns
- `doitCode.maxFileSize`: Maximum file size to scan (default: 1MB)
- `doitCode.supportedFileTypes`: File extensions to scan
- `doitCode.autoScan`: Enable/disable automatic scanning

---

## Legend

- ✨ Added: New features
- 🔧 Changed: Changes in existing functionality
- 🗑️ Deprecated: Soon-to-be removed features
- 🐛 Fixed: Bug fixes
- 🔒 Security: Security fixes
- 🚀 Performance: Performance improvements
- 📝 Documentation: Documentation changes

---
