# Doit Code - Advanced TODO Task Management

**Doit Code** is a powerful VS Code extension that combines automatic code scanning for TODOs with manual task management, providing a comprehensive solution for tracking your development tasks.

## ✨ Features

### 🔍 Automatic TODO Detection

- **Smart Scanning**: Automatically scans your workspace for `TODO:`, `FIXME:`, `HACK:`, `NOTE:`, and `BUG:` comments
- **File Integration**: Shows tasks with file location (filename:line) and provides direct navigation
- **Real-time Updates**: Automatically rescans when files change (configurable)
- **Intelligent Validation**: Periodically validates that tasks still exist in code files

### 📝 Manual Task Management

- **Quick Add**: Create manual tasks with a simple command
- **Full CRUD**: Edit, complete, and delete tasks easily
- **Persistent Storage**: Tasks are saved across VS Code sessions

### 🎛️ Task Operations

- ✅ **Mark Complete/Incomplete**: Toggle task completion status
- ✏️ **Edit Tasks**: Modify task descriptions
- 🗑️ **Delete Tasks**: Remove unwanted tasks
- 📂 **Open in File**: Navigate directly to TODO comments in code

### ⚙️ Smart Configuration

- **Exclusion Patterns**: Skip scanning `node_modules`, `dist`, `.git`, and other common folders
- **File Type Filtering**: Configure which file extensions to scan
- **Size Limits**: Skip large files to maintain performance (default: 1MB)
- **Custom Patterns**: Add your own exclusion rules
- **Similarity Detection**: Smart text matching to detect when tasks are modified vs new
- **Auto-complete**: Configurable behavior for deleted tasks

## 🚀 Getting Started

### Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Doit Code"
4. Click Install

### First Use

1. Open a workspace/folder in VS Code
2. The Doit Tasks panel will appear in the Explorer sidebar
3. Click "Rescan Workspace 🔄" to find existing TODOs
4. Use "Add Manual Task ➕" to create new tasks

## 📋 Commands

| Command                     | Description                      | Shortcut |
| --------------------------- | -------------------------------- | -------- |
| **Add Manual Task ➕**      | Create a new manual task         |          |
| **Rescan Workspace 🔄**     | Scan all files for TODOs         |          |
| **Configure Exclusions ⚙️** | Manage excluded folders/patterns |          |
| **Refresh**                 | Reload the task list             |          |
| **Open File**               | Open original file               |          |

## 🎯 Task Types

- TODO
- FIXME
- HACK
- NOTE
- BUG

### 📄 File Tasks (Automatic)

- Detected from code comments: `// TODO: Fix this bug`
- Show file location and line number
- Can be opened directly in the editor
- Automatically updated when files change
- Intelligent tracking: detects when tasks are modified vs deleted

### ✋ Manual Tasks

- Created by you for general project tasks
- Not tied to specific code locations
- Fully editable and manageable

## ⚙️ Configuration

### Settings

Access settings via `Ctrl+,` and search for "Doit Code":

| Setting                        | Type      | Default               | Description                                                                                         |
| ------------------------------ | --------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `doitCode.similarityThreshold` | `number`  | `0.5`                 | Similarity threshold (0-1) to detect if a task was modified. Higher values require more similarity. |
| `doitCode.autoComplete`        | `boolean` | `true`                | If `true`, marks tasks as completed when removed from code. If `false`, deletes them permanently.   |
| `doitCode.validationInterval`  | `number`  | `30000`               | Interval in milliseconds to validate tasks still exist in files (30000 = 30 seconds).               |
| `doitCode.excludePatterns`     | `array`   | `[]`                  | Additional file/folder patterns to exclude from scanning.                                           |
| `doitCode.maxFileSize`         | `number`  | `1048576`             | Maximum file size in bytes to scan (default: 1MB).                                                  |
| `doitCode.supportedFileTypes`  | `array`   | `[".js", ".ts", ...]` | File extensions to scan for TODOs.                                                                  |
| `doitCode.autoScan`            | `boolean` | `true`                | Enable automatic workspace scanning on startup.                                                     |

### Configuration Example

```json
{
  "doitCode.similarityThreshold": 0.7,
  "doitCode.autoComplete": true,
  "doitCode.validationInterval": 60000,
  "doitCode.excludePatterns": ["**/temp/**", "**/drafts/**", "**/*.backup.*"],
  "doitCode.maxFileSize": 1048576,
  "doitCode.autoScan": true
}
```

### 🔍 Configuration Details

#### **similarityThreshold**

Controls how similar two tasks must be to be considered the "same" modified task:

- `0.5` (50%) - More flexible, detects major changes as modifications
- `0.7` (70%) - Balanced, recommended for most cases
- `0.9` (90%) - Strict, only very small changes considered modifications

**Examples:**

- "Implement login" → "Implement login with OAuth" = ~72% similar ✅ (updated)
- "Implement login" → "Create registration page" = ~20% similar ❌ (new task)

#### **autoComplete**

Defines behavior when a task is removed from code:

- `true` - Task is marked as completed and remains in history
- `false` - Task is permanently deleted from the system

#### **validationInterval**

Frequency of automatic validation:

- `30000` (30s) - Frequent validation, recommended for active teams
- `60000` (1min) - Balance between performance and updates
- `120000` (2min) - Less system load, for large projects

**Note:** Set to `0` to disable automatic validation.

### Default Exclusions

The extension automatically excludes these common folders:

- `node_modules`, `dist`, `build`, `out`, `chunks`
- `.git`, `.vscode`, `.idea`
- `vendor`, `target`, `bin`, `obj`
- `.next`, `.nuxt`, `coverage`
- `__pycache__`, `.pytest_cache`, `venv`
- Minified files (`.min.js`, `.bundle.js`, etc.)

## 💡 Usage Examples

### Code Comments That Get Detected

```javascript
// TODO: Implement user authentication
// FIXME: This function causes memory leaks
// HACK: Temporary workaround for API issue
// NOTE: Remember to update documentation
// BUG: Login fails on mobile devices
```

### Supported Comment Styles

```python
# TODO: Add error handling
# FIXME: Optimize this query
```

```html
<!-- TODO: Add responsive design -->
<!-- FIXME: Fix accessibility issues -->
```

```css
/* TODO: Implement dark theme */
/* FIXME: Cross-browser compatibility */
```

## 🔧 Advanced Usage

### Task Lifecycle

1. **New Task Detected**: When a TODO comment is added to code
2. **Task Modified**: When comment text changes (detected by similarity)
3. **Task Removed**: When comment is deleted from code
   - With `autoComplete: true` → Marked as completed
   - With `autoComplete: false` → Permanently deleted

### Custom Exclusion Patterns

Add patterns to exclude specific files or folders:

1. Use the "Configure Exclusions ⚙️" command
2. Choose "Add exclusion pattern"
3. Enter patterns like:
   - `**/temp/**` - Exclude all temp folders
   - `**/*.test.js` - Exclude test files
   - `**/docs/**` - Exclude documentation

### Performance Optimization

- Large files (>1MB) are skipped by default
- File content is cached for 5 seconds to reduce parsing
- Batch processing prevents UI blocking
- Adjust `validationInterval` for better performance on large projects
- Use exclusion patterns for large dependency folders

### Multiple TODOs in Same File

The extension intelligently handles multiple TODOs in a single file:

- Tracks each TODO independently by line number and content
- Detects which TODOs were added, modified, or removed
- Prevents false positives when adding new TODOs alongside existing ones

## 🛠 Troubleshooting

### Tasks Not Appearing

1. Check if auto-scan is enabled: `doitCode.autoScan: true`
2. Verify file extensions are in `supportedFileTypes`
3. Ensure files aren't excluded by patterns
4. Try manual "Rescan Workspace 🔄"

### Tasks Marked as Completed Incorrectly

1. Increase `similarityThreshold` (try 0.7 or 0.8)
2. Check that TODO comments follow standard format
3. Ensure file hasn't been excluded accidentally

### Tasks Not Updating When Code Changes

1. Save the file after making changes
2. Check `validationInterval` setting
3. Try manual rescan if automatic detection isn't working

### Performance Issues

1. Add more exclusion patterns for large folders
2. Reduce `maxFileSize` limit
3. Increase `validationInterval` to reduce validation frequency
4. Limit `supportedFileTypes` to essential extensions

### Missing Context Menu

- Right-click on tasks in the Doit Tasks panel
- Options appear based on task type (file vs manual)

## 🤝 Contributing

Found a bug or have a feature request?

1. Check existing issues on GitHub
2. Create a detailed bug report or feature request
3. Include VS Code version and extension version

## 📄 License

MIT License - see LICENSE file for details

## 📝 Changelog

### v1.1.0

- ✨ Intelligent task validation system
- 🎯 Similarity-based task matching
- ⚡ Performance optimizations with caching
- 🔄 Configurable validation intervals
- 🎛️ Auto-complete behavior for removed tasks
- 📊 Better handling of multiple TODOs per file
- 🚀 Batch processing for large workspaces

### v1.0.0

- ✨ Initial release
- 🔍 Automatic TODO detection
- 📝 Manual task management
- ⚙️ Configurable exclusions
- 📂 File navigation integration
- 🎯 Performance optimizations

---

**Happy coding with Doit Code! 🚀**

_Keep your TODOs organized and never lose track of important tasks again._
