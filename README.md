# DotCommand - VS Code Extension

Intelligent Command Management with Brain-like Organization 🧠

A powerful VS Code extension that learns your terminal habits, intelligently organizes commands, and provides enterprise-grade command management with 90-day trash recovery.

🔥 Features

 🎨 REVOLUTIONARY TASK MANAGER UI - No More JSON Editing! (v1.2.0) 🆕

✅ Visual Task Creation - Beautiful form-based UI to add npm tasks without coding
✅ One-Click Operations - Add, edit, run, and delete tasks with visual controls
✅ Smart Categorization - Automatic organization into Setup, Build, Testing, etc.
✅ VS Code Integration - Tasks save to standard `.vscode/tasks.json` file
✅ Real-Time Filtering - Filter tasks by category with visual tags
✅ Professional UX - VS Code-themed interface matching your editor

Access it via: `Ctrl+Shift+P` → "DotCommand: Task Manager" or toolbar button

 🧠 AI-Powered Command Intelligence (v1.1.0)
✅ Prepared Commands System - 42+ built-in interactive templates with dynamic parameters
✅ File Extension Validation - All file operations require proper extensions (.txt, .js, .html, etc.)
✅ Smart Parameter Prompts - Intelligent input collection with validation
✅ Multiple Command Trees - Separate "My Commands" and "Prepared Commands" interfaces

 🏗️ Smart Organization
✅ Auto-Categorization - Commands automatically sorted into `git-workspace`, `npm-scripts`, `docker-build`, etc.
✅ Recent & Most Used - Commands promoted to special sections based on usage patterns
✅ Favorites System - Star important commands for instant access
✅ 90-Day Trash Bin - Safe deletion with full restore capability

 ⚡ Powerful Actions
✅ Double-Click to Run - Execute commands directly from tree view
✅ Copy to Clipboard - Instant clipboard access with visual feedback
✅ Terminal Auto-Save - Learns commands from your terminal sessions
✅ Bulk Operations - Multi-select delete, bulk restore from trash

 🧠 Intelligent Management
✅ Usage Tracking - Commands automatically promoted to "Most Used" after 5 executions
✅ Smart Cleanup - Automatic garbage collection while preserving valuable commands
✅ Context Menus - Right-click actions for all operations
✅ Rich Tooltips - Comprehensive metadata display with usage stats

 🌐 Modern UI
✅ Tree View Integration - Native VS Code sidebar with smart icons
✅ Category-Based Folders - Visual grouping with appropriate icons
✅ Status Indicators - Emoji badges show favorites, auto-saved, etc.
✅ Web View Support - Rich interface for complex operations

 🎯 Prepared Command Categories (v1.1.0)

# 🚀 Git Commands (6 interactive)
- Create & Switch Branch: `git checkout -b {branch}`
- Commit with Custom Message: `git commit -m "{message}"`
- Push to Branch: `git push origin {branch}`
- Create Tag: `git tag -a {tag} -m "{message}"`

# 📦 NPM Commands (7 interactive)
- Install Package: `npm install {package}`
- Execute Custom Script: `npm run {script}`
- Add DevDependency: `npm install --save-dev {package}`

# 🐳 Docker Commands (8 with validation)
- Build Custom Image: `docker build -t {name} .`
- Run on Custom Port: `docker run -p {port}:{port} {image}`
- Execute Shell: `docker exec -it {container} sh`

# ☸️ Kubernetes Commands (6 interactive)
- Get Pod Logs: `kubectl logs {pod}`
- Scale Deployment: `kubectl scale deployment {deployment} --replicas={replicas}`
- Apply Manifest: `kubectl apply -f {manifest}`

# 🐧 Linux Commands (10 with file validation)
- Copy File: `cp {source} {destination}` *(requires .extension)*
- Move File: `mv {source} {destination}` *(requires .extension)*
- View File: `cat {file}` *(requires .extension)*
- Find Files: `find {directory} -name "{pattern}"`
- Search Text: `grep "{search}" {file}` *(requires .extension)*

Keyboard Shortcuts

- Ctrl+Shift+S (Windows/Linux) or Cmd+Shift+S (Mac) - Save a new command
- Ctrl+Shift+V (Windows/Linux) or Cmd+Shift+V (Mac) - View and copy commands

VS Code Tasks Integration 🛠️

DotCommand integrates seamlessly with VS Code's built-in task system, allowing you to run your commands directly from the Task Runner (Ctrl+Shift+P → "Tasks: Run Task").

 Four Sources of Tasks

1. 📂 `.vscode/tasks.json` - Your standard build tasks (compile, watch)
2. 💾 Saved Commands - Your personal saved commands (favorites & most-used)
3. ⚡ Built-in Prepared - All 42+ built-in prepared commands
4. 📋 `.vscode/tasks.json` (from templates) - Auto-generated project workflows (NEW!)

 🎯 Create New Task Template (v1.1.0) - Auto-Generate Project Workflows

DotCommand now provides one-click task template generation to bootstrap your project with complete task workflows!

# 🏗️ How to Use

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

# 📊 Multi-Template Support

When `.vscode/tasks.json` already exists, DotCommand offers smart merging:

- Add to existing tasks → Combine new template with current tasks
- Replace all tasks → Full replacement (backup recommended)
- Cancel → Keep existing setup unchanged

# Example: NPM Project Template (11 tasks)
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

# 🌟 Customization Workflow
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

# 🌟 Smart Sections
- ⭐ Favorites - Starred commands for instant access
- 🕒 Recent - Last 10 executed commands
- 🗑️ Trash - Deleted commands (90-day restoration window)

# 📂 Auto-Categories
Commands are automatically categorized based on keywords:
- `git-workspace` → `git status`, `git add .`, `git diff`
- `npm-scripts` → `npm run dev`, `npm run build`
- `docker-build` → `docker build`, `docker-compose up`
- `k8s-deploy` → `kubectl apply`, `helm install`

# 🎯 Usage-Based Promotion
- Commands used 5+ times automatically move to "Most Used" category
- Commands used in last 30 days appear in Recent section
- Favorites always preserved during cleanup operations

 💡 Advanced Features

# 🗑️ Trash Bin Recovery
- Deleted commands go to trash (not permanently lost)
- 90-day recovery window - restore anytime
- Auto-cleanup removes trash after 90 days
- Visual indicators show deletion time

# 🤖 Terminal Learning
- Automatically captures meaningful terminal commands
- Filters out navigation commands (`cd`, `ls`, `pwd`)
- Categorizes and organizes new commands instantly
- Silent operation with optional notifications

# ⚙️ Configuration Options
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
# Package management
npm install lodash
npm run dev
npm run build

# Git operations
git add .
git commit -m "feat: add new feature"
git push origin main

# Docker commands
docker build -t myapp .
docker run -p 3000:3000 myapp
docker-compose up

# File operations
find . -name "*.ts" -type f
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
├── extension.ts          # 🎯 Main entry point (194 lines - clean & organized)
├── commandDetection.ts   # 🧠 Smart categorization logic
├── commandCleaning.ts    # 🧹 Terminal prompt cleaning utilities
├── commandHandlers.ts    # ⚡ User action handlers (save, run, delete, etc.)
├── historyHandlers.ts    # 📚 Terminal history import functionality
├── trashHandlers.ts      # 🗑️ 90-day trash bin management
├── viewHandlers.ts       # 🎨 View/UI management utilities
├── treeView.ts          # 🌳 Enhanced tree view with smart features (350+ lines)
├── storage.ts           # 💾 Data persistence with intelligent cleanup
├── types.ts             # 📝 TypeScript interfaces & definitions
└── webview.ts          # 🌐 Rich web interface components
```

 Building

```bash
npm install    # Install dependencies
npm run compile # Compile TypeScript to JavaScript
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
