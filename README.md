# DotCommand v1.5.0 - Intelligence Foundation & Command Expansion 📊🧠

Intelligent Development Assistant with Analytics & ML-Powered Suggestions

Intelligent Development Assistant with Project Understanding

A revolutionary VS Code extension that understands your project context, suggests relevant commands automatically, and provides framework-specific development workflows with professional update management.

 🚀 Quick Start (1 minute to intelligent)

1. Install the extension from VS Code Marketplace
2. Open any project - DotCommand automatically detects your tech stack
3. Press `Ctrl+Alt+Space` for instant context-aware suggestions
4. Enjoy framework-specific templates and native file pickers

 🔥 Why DotCommand v1.5.0?

- 📊 **Analytics Engine** - Track suggestion clicks, acceptance rates, and response times
- 🧠 **ML-Based Suggestions** - Weighted scoring using frequency, recency, context, and category
- 📦 **Package Intelligence** - Smart suggestions from package.json dependencies
- 🔧 **Custom Context Rules** - Define personal context triggers via JSON
- 🧪 **Comprehensive Testing** - 37+ tests for all features
- 🌍 **Extended Detection** - 15+ new technologies (Flutter, Gradle, Maven, Terraform, etc.)
- 📚 **180+ Commands** - 20 categories including Rust, Go, pnpm, Terraform, AWS, Flutter
- 🔒 **Production Ready** - Clean console output in production builds

## 🚀 v1.4.0 Smart Context Awareness Revolution

DotCommand v1.4.0 transforms from a command manager into an **intelligent development assistant** that understands your project context and suggests relevant commands automatically.

### 🎯 How Smart Context Awareness Works

1. **Project Analysis** - Scans your workspace for technology indicators
2. **Context Detection** - Identifies frameworks, tools, and project structure
3. **Intelligent Suggestions** - Shows relevant commands based on what you're working on
4. **Framework Workflows** - Provides complete development pipelines for detected technologies

### 🧠 Context Detection Engine

**Technology Recognition:**
- 📦 **Node.js/npm** - Detects `package.json`, suggests npm scripts and dependencies
- ⚛️ **React** - Identifies React projects, suggests component creation and build workflows
- 🟦 **TypeScript** - Recognizes `.ts` files, suggests compilation and type checking
- 🐳 **Docker** - Finds `Dockerfile`, suggests container operations and networking
- 🚀 **Git** - Detects `.git` directory, suggests branching and commit workflows
- 🐍 **Python** - Identifies `requirements.txt`, suggests venv and testing commands
- 🔺 **Angular** - Recognizes `angular.json`, suggests CLI generators and builds

**File Content Analysis:**
- Pattern matching in source files (React imports, Angular decorators)
- Configuration file parsing (package.json scripts, tsconfig.json settings)
- Directory structure analysis for project type identification

### ⚡ Smart Access Features

**Status Bar Integration:**
- 💡 Lightbulb icon shows top suggestion for current context
- Click for instant access to context-aware commands
- Tooltip displays relevance score and matched triggers

**Quick Picker (`Ctrl+Alt+Space`):**
- Context-aware suggestions with relevance scores
- Framework-specific command categories
- Native VS Code file/folder picker integration
- Git branch dropdown with current branch highlighting

**Template Manager:**
- "Suggested for this Project" section at the top
- Context-aware recommendations based on detected technologies
- Relevance scoring and trigger explanations

### 🏗️ Framework-Specific Intelligence

**React Projects:**
- Component creation with hooks/contexts patterns
- Development server and build optimizations
- Testing workflows and deployment scripts

**Vue.js Applications:**
- SFC component generation with Composition API
- Vuex/Pinia state management commands
- Build and development server operations

**Angular Workspaces:**
- CLI generator commands for components, services, modules
- Development server with hot reload
- Production build and deployment workflows

**TypeScript Projects:**
- Compilation and type checking commands
- Interface and module generation
- Build pipeline integration

**Go Applications:**
- Module management and dependency commands
- Testing and benchmarking workflows
- Build and deployment pipelines

**Python Environments:**
- Virtual environment setup and management
- Package installation and dependency management
- Testing frameworks and linting tools

**Docker Projects:**
- Multi-stage build optimizations
- Container networking and volume management
- Compose file operations and orchestration

**Git Repositories:**
- Advanced branching strategies and merge workflows
- Tagging and release management
- Remote repository operations and collaboration

### 🎨 Professional User Experience

**Update System:**
- Automatic "What's New" panels on version updates
- Beautiful markdown changelog rendering
- Feature categorization with emojis and grouping
- Smart timing (3-day display limit) to avoid annoyance

**Native VS Code Integration:**
- File picker dialogs instead of text input for file paths
- Git branch dropdowns with current branch indicators
- Status bar integration with context awareness
- Professional tooltips and progress indicators

### 📊 Technical Excellence

**Architecture:**
- ContextDetector class for workspace scanning
- SuggestionQuickAccess for status bar management
- UpdateService for version checking and panels
- Modular file structure with clean separation of concerns

**Performance:**
- 30-second caching for workspace scanning
- Real-time cache invalidation on file changes
- Lazy loading and efficient resource management
- Optimized suggestion algorithms

**Quality Assurance:**
- Comprehensive test suite covering all scenarios
- ESLint compliance with zero compilation errors
- TypeScript strict mode with full type coverage
- Real-world testing with 12 different project types

### 🚀 Development Workflow Transformation

**Before v1.4.0:**
- Static command library requiring manual organization
- Generic templates without project awareness
- Manual file path input and branch selection
- No understanding of project context or technologies

**After v1.4.0:**
- Intelligent assistant that understands your project
- Context-aware suggestions appear automatically
- Framework-specific templates with complete workflows
- Native VS Code integration for professional UX

### 📈 Impact Metrics

- **19/19 tasks completed** - 100% success rate for v1.5.0
- **37+ tests** across Analytics, ML, and PackageJson modules
- **20 command categories** with 180+ prepared commands
- **15+ technologies** automatically detected and supported

## 🧪 v1.5.0 Test Suites

Run tests from Command Palette:
- `dotcommand.runTests` - Analytics Test Suite
- `dotcommand.runMLTests` - ML Suggestions Test Suite  
- `dotcommand.runPackageJsonTests` - PackageJson Parser Test Suite (37 tests)

### 📊 Analytics Test Suite
- Session tracking (start, duration, events)
- Suggestion analytics (clicks, dismissals, acceptance rates)
- Command success rate tracking
- Context accuracy measurement

### 🧠 ML Suggestions Test Suite
- Frequency-based scoring
- Recency-based scoring
- Category preference scoring
- Context matching scoring

### 📦 PackageJson Parser Test Suite (37 tests)
1. Package Manager Detection (7) - pnpm > yarn > bun > npm priority
2. PackageJsonInfo Structure (2)
3. hasPackage() (3)
4. getPackageType() (3)
5. getAllDependencies() (3)
6. getScripts() (2)
7. Smart Suggestions (11) - react→react-dom, eslint→prettier, etc.
8. Relevance Sort (4) - exact > starts-with > alphabetical
9. Singleton Pattern (1)
10. Cache Invalidation (2)

## 📦 Package Intelligence

DotCommand parses your `package.json` and provides smart suggestions:
- **Missing companion packages**: react → react-dom, @types/react
- **Development tools**: eslint → prettier, jest → @types/jest
- **Type definitions**: typescript → @types/node, axios → @types/axios
- **Package manager detection**: Auto-detects pnpm/yarn/bun/npm

## 🌍 Extended Technology Detection (15+ new)

DotCommand now detects:
- **Mobile**: Flutter, Dart
- **Build Tools**: Gradle, Maven, CMake, Make
- **Cloud**: Terraform, AWS CLI
- **Languages**: Rust (cargo), Go, C#
- **Package Managers**: pnpm, Yarn
- **Frameworks**: Next.js, Nuxt.js, Svelte, Electron

## 📚 Command Categories (20 Categories, 180+ Commands)

| Category | Icon | Examples |
|----------|------|----------|
| 🚀 Git | branch | checkout, commit, push, merge |
| 📦 npm | package | install, run, test, build |
| 🐳 Docker | container | build, run, compose, logs |
| ☸️ Kubernetes | cloud | apply, get pods, scale |
| 🦀 Rust | debug-start | cargo build, run, test |
| 🐹 Go | arrow-right | go build, run, test |
| 📦 pnpm | package | install, add, remove |
| 🏗️ Terraform | cloud | init, plan, apply |
| ☁️ AWS | cloud | s3 cp, ec2 ls, lambda invoke |
| 📱 Flutter | device-mobile | run, build, pub get |
| 🏗️ Gradle/Maven | tools | build, test, clean |
| 🔐 SSH/Remote | remote | ssh, scp, rsync |
| ⚛️ VS Code | extensions | vsce package, publish |
| 🐧 Linux | terminal | cp, mv, grep, find |
| 🐍 Python | terminal | pip, pytest, venv |
| + More | ... | Full development workflows |

 ⭐ 5 Levels of Command Access

| Level | Method | Description |
|-------|--------|-------------|
| 🎯 1. Direct | Status Bar Buttons | Always-visible Quick Run, Favorites, Recent |
| ⌨️ 2. Keyboard | 15+ Shortcuts | Power-user shortcuts for instant access |
| 🔍 3. Search | Quick Command Picker | Universal fuzzy search across all commands |
| 💡 4. Smart | Intelligent Suggestions | Auto-complete based on usage patterns |
| 👆 5. Context | Right-click Menus | Access everywhere in VS Code |

 🧠 Intelligent Features

 Smart Organization
- Auto-Categorization - Commands sorted into `git-workspace`, `npm-scripts`, `docker-build`, etc.
- Usage-Based Promotion - Commands promoted to "Most Used" after 5 executions
- Favorites System - Star important commands for instant access
- 90-Day Trash Recovery - Safe deletion with full restore capability

 AI-Powered Learning
- Terminal Learning - Automatically captures and categorizes commands
- Usage Analytics - Tracks patterns and suggests improvements
- Smart Suggestions - Context-aware command recommendations
- History Intelligence - Learns from your command execution patterns

 ⚡ Power User Features

 Universal Access
- Quick Command Picker - `Ctrl+Shift+R` searches everything
- Status Bar Integration - Always-visible buttons
- Enhanced Shortcuts - 15+ keyboard combinations
- Context Menus - Right-click access everywhere

 Advanced Workflows
- Command Templates - Dynamic commands with variables
- Template Manager - Visual template creation
- Batch Operations - Multi-select and bulk actions
- Terminal Integration - Seamless VS Code terminal support

 🎯 Prepared Command Categories (v1.1.0)

 🚀 Git Commands (6 interactive)
- Create & Switch Branch: `git checkout -b {branch}`
- Commit with Custom Message: `git commit -m "{message}"`
- Push to Branch: `git push origin {branch}`
- Create Tag: `git tag -a {tag} -m "{message}"`

 📦 NPM Commands (7 interactive)
- Install Package: `npm install {package}`
- Execute Custom Script: `npm run {script}`
- Add DevDependency: `npm install --save-dev {package}`

 🐳 Docker Commands (8 with validation)
- Build Custom Image: `docker build -t {name} .`
- Run on Custom Port: `docker run -p {port}:{port} {image}`
- Execute Shell: `docker exec -it {container} sh`

 ☸️ Kubernetes Commands (6 interactive)
- Get Pod Logs: `kubectl logs {pod}`
- Scale Deployment: `kubectl scale deployment {deployment} --replicas={replicas}`
- Apply Manifest: `kubectl apply -f {manifest}`

 🐧 Linux Commands (10 with file validation)
- Copy File: `cp {source} {destination}` (requires .extension)
- Move File: `mv {source} {destination}` (requires .extension)
- View File: `cat {file}` (requires .extension)
- Find Files: `find {directory} -name "{pattern}"`
- Search Text: `grep "{search}" {file}` (requires .extension)

 ⌨️ Keyboard Shortcuts Reference

 Global Shortcuts (Work Everywhere)
- `Ctrl+Shift+R` → Quick Command Picker (universal search)
- `Ctrl+Shift+1` → Show Favorite Commands
- `Ctrl+Shift+H` → Show Recent Commands
- `Ctrl+Shift+Y` → Command History
- `Ctrl+Shift+A` → Analytics Dashboard
- `Ctrl+Shift+T` → Template Manager
- `Ctrl+Shift+M` → Task Manager

 Editor Shortcuts
- `Ctrl+Shift+S` → Save Command (from selection)
- `Ctrl+Shift+V` → View Commands

 Tree View Shortcuts (Context-Aware)
- `Ctrl+Shift+F` → Toggle Favorite (on command items)
- `Ctrl+Shift+Enter` → Run Command (on command items)
- `Ctrl+Shift+C` → Copy Command (on command items)
- `Ctrl+Shift+/` → Search/Filter (in command views)
- `Ctrl+Shift+X` → Clear Filters (in command views)

 Legacy Shortcuts
- `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac) - Save a new command
- `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac) - View and copy commands

 ⚙️ Configuration Options

 Smart Features
- `dotcommand.suggestions.enabled` → Enable intelligent command suggestions (default: true)
- `dotcommand.history.enabled` → Track command usage history (default: true)
- `dotcommand.autoSave.enabled` → Learn commands from terminal (default: true)
- `dotcommand.suggestions.sortByFrequency` → Sort suggestions by usage (default: true)

 Limits & Storage
- `dotcommand.general.maxCommands` → Maximum stored commands (default: 1000)
- `dotcommand.history.maxSize` → History entries to keep (default: 1000)
- `dotcommand.mostUsedThreshold` → Executions for "Most Used" promotion (default: 5)

 Terminal Management
- `dotcommand.terminal.cleanup.enabled` → Auto-close inactive terminals (default: true)
- `dotcommand.terminal.cleanup.timeoutMinutes` → Cleanup timeout (default: 30)
- `dotcommand.terminal.category.enabled` → Category-based terminal naming (default: true)

 Validation & Safety
- `dotcommand.testing.enabled` → Enable command validation (default: true)
- `dotcommand.testing.strictMode` → Prevent saving dangerous commands (default: false)
- `dotcommand.autoSave.minLength` → Minimum command length to save (default: 2)

VS Code Tasks Integration 🛠️

DotCommand integrates seamlessly with VS Code's built-in task system, allowing you to run your commands directly from the Task Runner (Ctrl+Shift+P → "Tasks: Run Task").

 Four Sources of Tasks

1. 📂 `.vscode/tasks.json` - Your standard build tasks (compile, watch)
2. 💾 Saved Commands - Your personal saved commands (favorites & most-used)
3. ⚡ Built-in Prepared - All 42+ built-in prepared commands
4. 📋 `.vscode/tasks.json` (from templates) - Auto-generated project workflows (NEW!)

 🎯 Create New Task Template (v1.1.0) - Auto-Generate Project Workflows

DotCommand now provides one-click task template generation to bootstrap your project with complete task workflows!

 🏗️ How to Use

1. Open "My Commands" sidebar → click the `Create New Task Template` button (📋 icon)
2. Select project type from 6 templates:
   - 📦 NPM Project - Node.js with npm scripts, build, test, lint workflows
   - 🚀 Git Repository - Version control commands, branching, tagging
   - 🐳 Docker Container - Container build, run, compose operations
   - 🐍 Python Project - Virtual environments, testing, formatting
   - ⚛️ Frontend - React/Vue/Angular development workflows
   - 🛠️ Custom Project - Generic development tasks (placeholders)

3. Template creates `.vscode/tasks.json` with project-specific tasks
4. Tasks appear in VS Code → Ctrl+Shift+P → "Tasks: Run Task"
5. Move tasks to personalize → right-click any task → "Move to My Commands"

 📊 Multi-Template Support

When `.vscode/tasks.json` already exists, DotCommand offers smart merging:

- Add to existing tasks → Combine new template with current tasks
- Replace all tasks → Full replacement (backup recommended)
- Cancel → Keep existing setup unchanged

 Example: NPM Project Template (11 tasks)
```
📦 NPM Tasks/
├── Install Dependencies     npm install
├── Start Development        npm run dev
├── Start Production         npm run start
├── Build Project           npm run build
├── Run Tests              npm run test
├── Run Tests Watch        npm run test:watch
├── Run Linter             npm run lint
├── Format Code            npm run format
├── Clean Cache            npm run clean
├── Audit Packages         npm audit
└── Update Packages        npm update
```

 🌟 Customization Workflow
1. Generate template → Get complete task suite instantly
2. Run tasks → Test and verify functionality via VS Code Tasks panel
3. Customize → Move tasks to "My Commands" for modification
4. Iterate → Add more templates or adjust existing ones
5. Scale up → Build comprehensive multi-project workflows

 Using tasks.dotcommand

Create a `tasks.dotcommand` file in your project root for custom project tasks:

```json
{
  "version": "1.0.0",
  "preparedTasks": [
    {
      "label": "🚀 Deploy to Production",
      "command": "npm run build && npm run test && git tag v${input:version} && git push origin v${input:version}",
      "description": "Full production deployment workflow",
      "category": "Deployment",
      "parameters": [
        {
          "name": "version",
          "description": "Version to deploy (e.g., 1.2.3)",
          "defaultValue": "1.0.0",
          "type": "string"
        }
      ]
    },
    {
      "label": "🐳 Start Development Stack",
      "command": "docker-compose -f docker-compose.dev.yml up -d",
      "description": "Start full development environment",
      "category": "Development"
    }
  ]
}
```

 Running Tasks

1. Press Ctrl+Shift+P and select "Tasks: Run Task"
2. Choose from your tasks organized by category:
   - Git Commands - Branch operations, commits, tags
   - NPM Commands - Package management, scripts
   - Docker Commands - Container operations
   - Saved Commands - Your personal favorites
   - Project Tasks - Custom tasks from `tasks.dotcommand`

 Task Categories & Organization

Tasks are automatically categorized and appear in VS Code's task picker:
- 🔄 Build Group - Git and NPM tasks
- ⚡ Other Group - Docker, Kubernetes, Linux commands
- ⭐ Favorites - Your starred saved commands
- 📂 Project - Custom tasks from `tasks.dotcommand`

Tasks refresh automatically when you update `tasks.dotcommand` or modify your saved commands.

Usage

 Saving Commands

1. Select text in your editor (optional)
2. Press Ctrl+Shift+S (or Cmd+Shift+S on Mac)
3. Enter the command (pre-filled if you had text selected)
4. Optionally add a name and category for better organization
5. Press Enter to save

 Viewing and Using Commands

1. Press Ctrl+Shift+V (or Cmd+Shift+V on Mac)
2. Browse your saved commands in the tree view sidebar
3. Double-click commands to run them directly in terminal
4. Right-click commands for context menu options:
   - 🔄 Run Command - Execute in active terminal
   - 📋 Copy Command - Copy to clipboard
   - ⭐ Toggle Favorite - Star/unstar for quick access
   - 🗑️ Delete Command - Move to trash (recoverable within 90 days)

 Intelligent Organization

 🌟 Smart Sections
- ⭐ Favorites - Starred commands for instant access
- 🕒 Recent - Last 10 executed commands
- 🗑️ Trash - Deleted commands (90-day restoration window)

 📂 Auto-Categories
Commands are automatically categorized based on keywords:
- `git-workspace` → `git status`, `git add .`, `git diff`
- `npm-scripts` → `npm run dev`, `npm run build`
- `docker-build` → `docker build`, `docker-compose up`
- `k8s-deploy` → `kubectl apply`, `helm install`

 🎯 Usage-Based Promotion
- Commands used 5+ times automatically move to "Most Used" category
- Commands used in last 30 days appear in Recent section
- Favorites always preserved during cleanup operations

 💡 Advanced Features

 🗑️ Trash Bin Recovery
- Deleted commands go to trash (not permanently lost)
- 90-day recovery window - restore anytime
- Auto-cleanup removes trash after 90 days
- Visual indicators show deletion time

 🤖 Terminal Learning
- Automatically captures meaningful terminal commands
- Filters out navigation commands (`cd`, `ls`, `pwd`)
- Categorizes and organizes new commands instantly
- Silent operation with optional notifications

 ⚙️ Configuration Options
```json
{
  "dotcommand.general.maxCommands": 1000,
  "dotcommand.autoSave.enabled": true,
  "dotcommand.autoSave.minLength": 2,
  "dotcommand.mostUsedThreshold": 5
}
```

Examples

Here are some example commands you might want to save:

```
 Package management
npm install lodash
npm run dev
npm run build

 Git operations
git add .
git commit -m "feat: add new feature"
git push origin main

 Docker commands
docker build -t myapp .
docker run -p 3000:3000 myapp
docker-compose up

 File operations
find . -name ".ts" -type f
grep -r "TODO" src/
```

Installation

1. Open this project in VS Code
2. Press F5 to run the extension in development mode
3. The extension will be installed in a new "Extension Development Host" window

Development

 🏗️ Project Structure

```
src/
├── extension.ts           🎯 Main entry point (194 lines - clean & organized)
├── commandDetection.ts    🧠 Smart categorization logic
├── commandCleaning.ts     🧹 Terminal prompt cleaning utilities
├── commandHandlers.ts     ⚡ User action handlers (save, run, delete, etc.)
├── historyHandlers.ts     📚 Terminal history import functionality
├── trashHandlers.ts       🗑️ 90-day trash bin management
├── viewHandlers.ts        🎨 View/UI management utilities
├── treeView.ts           🌳 Enhanced tree view with smart features (350+ lines)
├── storage.ts            💾 Data persistence with intelligent cleanup
├── types.ts              📝 TypeScript interfaces & definitions
└── webview.ts           🌐 Rich web interface components
```

 Building

```bash
npm install     Install dependencies
npm run compile  Compile TypeScript to JavaScript
```

 Publishing

1. Update version in `package.json`
2. Run `npm run compile`
3. Package with `vsce package`
4. Publish with `vsce publish`

Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute to this project.

License

MIT License - feel free to use this project as you wish.

Support

If you find this extension helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or issues
- 💡 Suggesting new features
- ☕ Buying me a coffee

---

Happy coding! 🚀
