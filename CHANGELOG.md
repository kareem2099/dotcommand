Changelog

All notable changes to the DotCommand VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


 [1.5.0] - 2026-02-19

📊 INTELLIGENCE FOUNDATION & COMMAND EXPANSION - Complete Analytics & ML-Powered Suggestions

### 🎯 Core Intelligence Features
- **Analytics Service** - Full tracking for suggestion clicks, acceptance rates, and response times in local storage
- **ML-Based Suggestions** - Weighted scoring using usage frequency, recency, context match, and category preference
- **Session Tracking** - Track session ID, duration, and session events for user activity analysis
- **Command Success Rate** - Monitor command reliability with success/failure tracking per command
- **Context Accuracy** - Measure and learn from how often detected context is correct via user corrections

### 📦 Package Intelligence System
- **Smart Package Suggestions** - Parse package.json and suggest existing dependencies when installing new packages
- **Package Manager Detection** - Priority: pnpm > yarn > bun > npm
- **Companion Package Suggestions**:
  - react → react-dom, @types/react
  - eslint → prettier
  - jest → @types/jest
  - typescript → @types/node
  - axios → @types/axios

### 🔧 Custom Context Rules
- **JSON-Based Rules** - Users can define custom context triggers for personal templates via JSON config
- **Pattern Matching** - File patterns, directory checks, dependency verification
- **Extensible System** - Easy to add new rule types

### 🧪 Comprehensive Test Suite
- **Analytics Test Suite** - Full test coverage for event tracking, session, and success rates
- **ML Suggestions Test Suite** - Testing scoring, ranking, and context matching
- **PackageJson Parser Test Suite** - 37 tests covering:
  - Package Manager Detection (7 tests)
  - PackageJsonInfo Structure (2 tests)
  - hasPackage() (3 tests)
  - getPackageType() (3 tests)
  - getAllDependencies() (3 tests)
  - getScripts() (2 tests)
  - Smart Suggestions (11 tests)
  - Relevance Sort (4 tests)
  - Singleton Pattern (1 test)
  - Cache Invalidation (2 tests)

### 🌍 Extended Context Detection
- **New Technologies Detected**: flutter, dart, gradle, maven, cmake, cpp, make, terraform, csharp, pnpm, yarn, nextjs, nuxtjs, svelte, electron
- **File Patterns**: pubspec.yaml, build.gradle, build.gradle.kts, pom.xml, CMakeLists.txt, Makefile, .tf files, pnpm-lock.yaml, setup.py, Pipfile

### 📚 Expanded Command Categories (20 Categories, 180+ Commands)
- **Rust Commands** (cargo) - build/run/test/clippy/fmt/add/doc
- **Go Commands** - go build/run/test/mod/get/vet/fmt
- **pnpm Commands** - install/add/dev/build/test/remove
- **Terraform Commands** - init/plan/apply/destroy/validate/fmt
- **AWS Commands** - S3/EC2/Lambda/CloudWatch/ECR
- **Flutter Commands** - run/build APK+iOS+Web/pub get/test/clean/doctor
- **Gradle & Maven Commands** - build/test/clean/run/Spring Boot
- **SSH & Remote Commands** - ssh/scp/rsync/ssh-keygen with dynamic parameters
- **VS Code Extension Commands** (vsce/ovsx) - package, publish, login, logout

### 🖥️ Smart Terminal Routing
- **New Terminal Categories**: Rust, Flutter, Gradle & Maven, SSH & Remote, Cloud (Terraform/AWS), Go
- **Priority Routing**: Rust before Go, Database before Go, SSH before Linux
- **Named Terminals**: DotCommand-Rust, DotCommand-Flutter, DotCommand-Cloud, etc.

### 🎨 Full Icon & Emoji Coverage
- Rust → 🦀 debug-start
- Go → 🐹 arrow-right
- pnpm → 📦 package
- Terraform → 🏗️ cloud
- AWS → ☁️ cloud
- Flutter → 📱 device-mobile
- Gradle/Maven → 🏗️ tools
- SSH/Remote → 🔐 remote

### 💾 Data-Driven Architecture
- **JSON-Based Prepared Commands** - Refactored from 500+ lines of hardcoded TypeScript to clean JSON
- **Easy Updates** - Adding commands requires only JSON edits
- **prepared.ts** reduced from 500+ lines to ~90 lines

### 🔗 Command Chaining Support
- Full support through template system using shell `&&` operator
- Template variables handle dynamic parts
- No timing issues, correct failure propagation

### 🧪 Test Commands Available
- `dotcommand.runTests` - Analytics Test Suite
- `dotcommand.runMLTests` - ML Suggestions Test Suite
- `dotcommand.runPackageJsonTests` - PackageJson Parser Test Suite (37 tests)

### 📈 Performance Monitoring
- Cache hit rate tracking
- Suggestion relevance scores
- Execution time monitoring

### 🔒 Production-Ready Logging
- Console silencing in production (log/warn/info/debug silenced, error kept)
- Webview console silencing via injected script
- Clean production output for users

### 🐛 Fixes & Improvements
- Fixed duplicate key issues in webview messaging
- Fixed unnecessary escape characters in JavaScript
- Improved webview console silencing implementation

---

 [1.4.0] - 2026-01-13

🧠 SMART CONTEXT AWARENESS REVOLUTION - Extension now understands your project and suggests relevant commands automatically

### 🎯 Core Intelligence Features
- Context-aware template suggestions based on project files
- 13+ technology detection (Node.js, React, Vue, Angular, TypeScript, Docker, Git, Python, Go, Rust, PHP, .NET)
- File content pattern matching for precise suggestions
- Relevance scoring system for smart prioritization
- Real-time workspace scanning and caching (30-second intervals)

### ⚡ Quick Access Features
- Status bar button for instant top suggestions with lightbulb icon
- `Ctrl+Alt+Space` keyboard shortcut for suggestion picker
- Native VS Code file/folder pickers instead of text input
- Git branch dropdown integration with current branch highlighting
- Quick picker with relevance scores and category tags

### 🏗️ Framework Support - Complete Development Workflows
- **React**: Components, hooks, contexts, production builds, testing workflows
- **Vue**: SFC components, composables, production builds, Vuex/Pinia integration
- **Angular**: CLI generators, dev server, production builds, service/component creation
- **TypeScript**: Compilation, interfaces, type checking, module generation
- **Go**: Full development workflows, testing, dependency management
- **Python**: Virtual environments, testing, linting, packaging
- **Docker**: Container operations, networking, logging, multi-stage builds
- **Git**: Branch management, commits, pushes, tagging, merge workflows

### 🛠️ Technical Improvements - Production Ready
- Advanced context triggers with file content pattern matching
- Clean TypeScript architecture with proper error handling
- ESLint compliant code with type safety and zero compilation errors
- Comprehensive test suite with 12 test projects covering all scenarios
- File system watcher integration for real-time context updates
- Performance optimized with intelligent caching and lazy loading

### 📱 Update System - Professional User Experience
- Automatic "What's New" panel on version updates (3-day display limit)
- Professional changelog rendering with markdown support
- Feature categorization with emojis and visual grouping
- Responsive design with VS Code theme integration
- Smart timing to avoid user annoyance

### 🎨 UI/UX Enhancements
- Enhanced template manager with "Suggested for this Project" section
- Context-aware UI with project-specific recommendations
- Improved status bar integration with suggestion previews
- Professional tooltips showing relevance scores and trigger sources
- Seamless integration with existing command management features

### 🔧 Advanced Architecture
- ContextDetector class with workspace scanning and technology detection
- SuggestionQuickAccess class for status bar and quick picker management
- UpdateService for version checking and changelog management
- Modular file structure with feature-based organization
- Singleton patterns for efficient resource management

### 📊 Smart Context Detection
- File existence triggers (package.json, Dockerfile, go.mod, etc.)
- File content pattern matching (React imports, Angular CLI detection, etc.)
- Directory structure analysis for project type identification
- Dynamic weight-based scoring for suggestion relevance
- Real-time cache invalidation on file system changes

### 🏆 Development Workflow Revolution
- Before: Static command library with manual organization
- After: Intelligent assistant that understands projects and suggests relevant workflows
- Context-aware suggestions appear automatically based on project files
- Framework-specific templates with complete development pipelines
- Native VS Code integration with file pickers and branch selection

### 📈 Feature Adoption Metrics
- 18/18 tasks completed (100% success rate)
- 23 total tasks across infrastructure, templates, UI, and advanced features
- Enterprise-grade codebase with maintainable, scalable architecture
- Complete context awareness for modern development workflows


 [1.3.0] - 2025-11-12

🎯 5 LEVELS OF COMMAND ACCESS - Complete Accessibility Revolution

 🏗️ Architecture Excellence - Enterprise-Grade Codebase
- Complete codebase reorganization with feature-based directory structure
- Clean separation of concerns with modular architecture (commands/, handlers/, providers/, storage/, utils/, webviews/)
- Large monolithic files broken down into focused, single-responsibility modules
- Enterprise patterns: dependency injection, clean interfaces, robust error handling
- Zero compilation errors with full TypeScript coverage and strict type safety
- Consistent naming conventions and file organization throughout

 🎯 Universal Command Access - 5 Levels of Accessibility
- Quick Command Picker: Universal fuzzy search across all commands (Ctrl+Shift+R)
- Status Bar Integration: Always-visible buttons for instant access (Quick Run, Favorites, Recent)
- Enhanced Keyboard Shortcuts: 15+ shortcuts for power users (global and context-aware)
- Command Suggestions: Intelligent auto-complete based on usage patterns and history
- Context Menus: Right-click access in editor, terminal, explorer, and status bar

 🧠 Intelligent Command Management - AI-Powered Organization
- Global Command History: Comprehensive tracking with search, filtering, and analytics
- Smart Categorization: Auto-organization into logical groups (git-workspace, npm-scripts, etc.)
- Usage-Based Promotion: Commands automatically promoted to "Most Used" based on execution frequency
- Terminal Learning: Automatic capture and categorization of terminal commands
- Advanced Search & Filtering: Real-time fuzzy search with multiple filter criteria
- Favorites System: Quick access to starred commands with visual indicators

 📝 Command Templates System - Dynamic Workflow Creation
- Template Engine: Dynamic command templates with variable substitution and validation
- Variable Handling: Built-in types (email, URL, number) with regex validation and user prompts
- Template Manager UI: Professional webview for visual template creation and management
- Predefined Templates: Ready-to-use templates for Git, Docker, NPM, Python, and Frontend workflows
- Template Persistence: Cross-session storage with usage statistics and categorization

 ⚡ Enhanced User Experience - Professional Polish
- Terminal Management: Category-based terminal naming with activity tracking and auto-cleanup
- Trash System: 90-day recovery window for accidentally deleted commands
- Webview Integration: Professional UI components with VS Code theme integration
- Testing Infrastructure: Comprehensive validation and error handling systems
- Configuration Options: Extensive customization with 20+ settings for all features

 🔧 Technical Improvements - Production Ready
- ESLint Configuration: Proper webview globals and strict linting rules
- Icon Integration: Custom PNG icons for all terminal instances
- Resource Management: Optimized loading and proper disposal of resources
- Error Resilience: Robust validation and graceful error recovery
- Performance Optimization: Efficient algorithms for large command collections

🎯 Development Workflow Revolution
- Before: Limited access through tree views and basic shortcuts
- After: 5 levels of access from status bar to context menus, intelligent suggestions, and comprehensive keyboard control

📊 Feature Adoption Metrics
- 33 completed tasks across architecture, accessibility, intelligence, and user experience
- 100% success rate on all planned improvements
- Enterprise-grade codebase with maintainable, scalable architecture
- Complete accessibility for users with different preferences and workflows

 [1.2.0] - 2025-10-22

🎨 REVOLUTIONARY TASK MANAGER UI - No More JSON Editing!

 🖥️ Task Manager Webview - Visual Command Creation
- 🎯 Drag-Drop UI: Beautiful form-based interface to create npm tasks without coding
- ➕ One-Click Add: "Add NPM Task" button opens professional creation form
- ✏️ Visual Editing: Click any task to edit label, command, and category inline
- 🗑️ Safe Deletion: Click delete with confirmation to prevent accidents
- ▶️ Immediate Execution: One-button task running directly from the UI
- 🏷️ Smart Categorization: Automatic organization (Setup, Development, Build, Testing, Deployment)

 🔄 Full CRUD Operations in UI
- Create: Form-based task creation with validation (npm/yarn/pnpm only)
- Read: Card-based display with commands, descriptions, and category badges
- Update: Inline editing - click any task to modify instantly
- Delete: Safe deletion with user confirmation dialogs

 🏗️ VS Code Standard Integration
- 📁 `.vscode/tasks.json` Priority: Tasks save to VS Code's standard configuration file first
- 🎯 Native Task Support: Created tasks work with VS Code's built-in `Terminal → Run Task` menu
- 🔗 Keyboard Shortcuts: `Ctrl+Shift+P` → "Tasks: Run Task" finds all UI-created tasks
- ⚡ Live Integration: Tasks update in real-time across VS Code's ecosystem

 🎭 Category-Based Organization
- 🏷️ Visual Tags: Filter tasks by category (All, Setup, Development, Build, Testing, Code Quality, Deployment)
- 📊 Smart Grouping: Tasks automatically categorized based on content analysis
- 🔍 Real-Time Filtering: Click category buttons to instantly filter task views
- 📈 Usage Insights: Category distribution helps organize project workflows

 🌟 Professional UX Excellence
- 📋 Clean Card Interface: Each task shows label, command, description, and category chips
- 🎨 VS Code Themes: Perfect integration with all VS Code color schemes
- ⚡ Instant Feedback: Form validation, success messages, and error handling
- 👆 Intuitive Interactions: Hover effects, visual feedback on all controls

 🛠️ Technical Implementation
- 🌐 Standalone Webview: Separate HTML/CSS/JavaScript for professional UI
- 🔒 Security First: Proper CSP policies and extension resource loading
- 💾 Smart Persistence: Auto-save to project `.vscode/tasks.json` with fallbacks
- 🔄 Bidirectional Sync: Real-time updates between UI and VS Code task system
- 🎛️ Singleton Pattern: Single webview instance with proper disposal

 📚 Enhanced Documentation
- 📖 Command Palette: Added "DotCommand: Task Manager" to command palette
- 🎛️ Toolbar Integration: Available in DotCommand view toolbar buttons
- 📋 Help Text: Clear form labels and helpful placeholders
- ✅ Success Feedback: Completion confirmations and task count summaries

🔧 Configuration Updates
- `dotcommand.taskManager`: New command for visual task management
- Built-in category system with `Setup`, `Development`, `Build`, `Testing`, `Code Quality`, `Deployment`, `Maintenance`

🎯 Development Workflow Revolution
- Before: Manual JSON editing in tasks.dotcommand → limited VS Code integration
- After: Visual form → auto-save to `.vscode/tasks.json` → full VS Code task ecosystem

🐛 Task Manager Fixes
- Resource loading from compiled extension bundle (works in production)
- CSP policy allows interactive functionality
- Proper validation for npm package manager commands (npm/yarn/pnpm)
- VS Code workspace folder detection and task persistence
- Category-based filtering with real-time UI updates

 [1.1.0] - 2025-10-16

🚀 MAJOR OVERHAUL - Enterprise-Grade Command Management

 🎯 Intelligent Command Organization
- 🧠 Auto-Categorization: Commands automatically sorted into specific categories like `git-workspace`, `npm-scripts`, `docker-build`, `k8s-deploy`
- 📊 Usage Tracking: Commands automatically promoted to "Most Used" after 5 executions
- 🕒 Recent Commands: Last 10 executed commands shown in dedicated section
- ⭐ Favorites System: Star important commands for instant access

 🗑️ 90-Day Trash Bin System
- Safe Deletion: Commands move to trash instead of permanent deletion
- Recovery Window: 90-day restoration period for accidentally deleted commands
- Auto-Cleanup: Expired trash (>90 days) automatically removed
- Visual Indicators: Trash items show deletion time

 🌳 Enhanced Tree View UI
- Smart Sections: Favorites, Recent, and Trash folders with appropriate icons
- Context Menus: Right-click access to all operations (run, copy, favorite, delete)
- Category Icons: Visual grouping with git-branch, package, vm, cloud icons
- Status Badges: Emoji indicators for favorites (⭐), auto-saved (🤖), terminal-history (📚)

 ⚡ Powerful Command Actions
- Double-Click Execution: Run commands directly from tree view
- Terminal Integration: Executes in active VS Code terminal
- Clipboard Operations: One-click clipboard copy with feedback
- Bulk Operations: Multi-select for complex actions

 🤖 Terminal AI Learning
- Auto-Capture: Learns meaningful commands from terminal sessions
- Smart Filtering: Excludes navigation commands (cd, ls, pwd)
- Instant Categorization: New commands organized automatically
- Silent Operation: Background processing with optional notifications

 🏗️ Complete Architecture Redesign
- Modular Structure: 12 separate files with single responsibilities
- Enterprise Patterns: Clean separation of concerns, dependency injection
- Type Safety: Full TypeScript coverage with comprehensive interfaces
- Error Resilience: Robust validation and user feedback systems

 🌟 PREPARED COMMANDS REVOLUTION 🚀
- 🧠 Dynamic Parameters: Commands now prompt for user input instead of static examples
- 📂 File Extension Validation: All file operations require proper extensions (.txt, .js, .html, etc.)
- 🔧 Interactive Templates: 42+ built-in commands with smart parameter collection
- 📁 File System Commands: Copy, move, view, find, and search with validation
- 🐧 Linux Commands: Generic file operations (cd, mkdir, etc.) available for all users

 🎭 Multiple Command Trees
- 🏠 "My Commands" Tree: Personal saved commands with auto-organization
- ⚡ "Prepared Commands" Tree: Built-in categorized templates

 🎨 Categorized Prepared Commands
- 🚀 Git Commands (6): Checkout branches, custom commits, tagging, etc.
- 📦 NPM Commands (7): Package management, scripting, dependencies
- 🐳 Docker Commands (8): Container operations, networking, logging
- ☸️ Kubernetes Commands (6): Pod management, deployments, scaling
- 🐧 Linux Commands (10): File operations, directory management, search

 🔒 Enhanced Validation
- File Extension Enforcement: Must include .txt, .js, .css, .html, etc.
- Parameter Validation: Port numbers (1-65535), branches, etc.
- Real-time Error Checking: Shows validation messages as users type

 🎯 Smart Command Experience
- Interactive Prompts: Clear descriptions guide user input
- Default Values: Helpful placeholders accelerate common tasks
- Confirmation Dialogs: Review final command before execution
- Error Recovery: Graceful handling of invalid inputs

🔧 Configuration Enhancements
- `dotcommand.general.maxCommands`: Maximum stored commands (default: 1000)
- `dotcommand.autoSave.enabled`: Terminal learning toggle
- `dotcommand.autoSave.minLength`: Minimum command length (default: 2)
- `dotcommand.mostUsedThreshold`: Executions for "Most Used" promotion (default: 5)

🐛 Fixed Issues
- All function handlers now work correctly (run, copy, delete, toggle favorite)
- Tree item ID conflicts resolved for different view categories
- Command registration failures eliminated
- Dynamic prepared command parameter lookup implemented
- Prepared commands now properly validate file extensions
- Multiple tree views (My Commands + Prepared Commands) working seamlessly

🎯 Task Template Revolution - Auto-Generate Project Workflows 🔥

 🏗️ One-Click Task Template Creation
- 📋 Create New Task Template: Toolbar button in "My Commands" to auto-generate project workflows
- 🎯 Smart Template Selection: Choose from 6 project types (NPM, Git, Docker, Python, Frontend, Custom)
- 🏗️ Intelligent Task Generation: Each template creates 8-12 relevant tasks with proper categories
- 🗂️ Proper File Organization: Tasks created in standard `.vscode/tasks.json` location

 📊 Multi-Template Workflow Support
- 🔗 Merge Logic: When `.vscode/tasks.json` exists, choose to "Add to existing" or "Replace all"
- 🛡️ Safe Merging: Add new tasks without losing existing customizations
- 📈 Additive Growth: Build comprehensive workflows one template at a time
- 🎛️ User Control: Clear options to preserve, merge, or replace existing tasks

 🔧 Template Categories with Full Coverage
- 📦 NPM Template (11 tasks): install, dev, build, test, lint, format, audit, update, clean
- 🚀 Git Template (9 tasks): status, add, commit, push, pull, log, branch, switch, merge
- 🐳 Docker Template (9 tasks): build, run, images, containers, logs, exec, compose, prune
- 🐍 Python Template (8 tasks): venv, pip, pytest, black, flake8, requirements, run scripts
- ⚛️ Frontend Template (8 tasks): dev, build, preview, test, e2e, lint, format, type-check
- 🛠️ Custom Template (6 tasks): Generic development workflow with customizable placeholders

 🌟 Move-to-My-Commands Integration
- ⬅️ Easy Customization: All user-prepared tasks (from templates) have "Move to My Commands" option
- 📝 Full Editing: Moved commands can be freely customized in personal command library
- 🔀 Seamless Workflow: Template → VS Code Tasks Panel → Move to personalize → Run everywhere

 🏗️ Standard VS Code Integration
- 📁 `.vscode/tasks.json`: Tasks work with VS Code's native Tasks panel (`Ctrl+Shift+B`)
- 🎯 Task Groups: Proper grouping (Build/Test) for templates
- 🔄 Auto-Refresh: Tasks update immediately when configuration changes
- 🧭 File Watching: Detects and reloads task file changes

 📚 Enhanced Documentation & UX
- 📖 Clear Explanations: Each template shows task count and descriptions
- 🤔 Smart Help Text: Tooltips explain merging options and consequences
- ✅ Success Feedback: Shows completion messages with task counts
- 🛡️ Safe Defaults: Conservative approach prevents accidental data loss

🔧 Configuration Updates
- `dotcommand.createNewTaskTemplate`: New command for task template generation
- `tasks.json` file watching: Automatic VS Code task integration refresh

🐛 Template System Fixes
- Template tasks properly load in VS Code Tasks panel
- Multi-template merging preserves existing tasks
- Move-to-commands functionality works for all template types
- Context menus show correct options for user-prepared tasks

 [1.0.0] - 2025-01-13

🏗️ Initial Release
- ✅ Save Command Feature - Save any command with optional name and category
- ✅ View & Copy Commands - Browse saved commands in webview interface
- ✅ Delete Command - Remove unwanted commands with confirmation
- ✅ Search & Filter - Real-time search functionality
- ✅ Keyboard Shortcuts - `Ctrl+Shift+S` (save) and `Ctrl+Shift+V` (view)
- ✅ Auto-detection - Automatically detects selected text or current line
- ✅ Persistent Storage - Commands saved in VS Code's global state
- ✅ Categories - Organize commands with custom categories
- ✅ Cross-platform Support - Works on Windows, Linux, and Mac
- ✅ Modern UI - Clean, VS Code-themed interface
- ✅ Error Handling - Comprehensive validation and user feedback
- ✅ TypeScript Support - Full type safety throughout the extension

🛠️ Technical Foundation
- VS Code Extension API - Native integration
- Webview API - Custom command browser interface
- Global State API - Persistent data storage
- Modern Async/Await - Clean asynchronous code patterns
- Input Validation - Prevents invalid commands
- Duplicate Detection - Warns before saving duplicates

 [Unreleased]

📋 Planned Enhancements (v1.5.0)
- 🔄 Package Auto-Complete: Smart suggestions from package.json dependencies
- 🔄 Context Analytics: Track suggestion usage for better recommendations
- 🔄 Custom Context Rules: Allow users to define personal context triggers
- 🔄 Performance Monitoring: Analytics dashboard for suggestion accuracy
- 🔄 Responsive Design: Enhanced UI for different screen sizes
- 🔄 Advanced Analytics Dashboard: Comprehensive usage statistics
- 🔄 Rule Builder UI: Visual interface for custom context rules
- 🔄 ML-Based Suggestions: Machine learning for user preference learning

---

🎉 DotCommand v1.4.0 transforms development workflows with intelligent context awareness, framework-specific automation, and professional update management!

For more detailed technical changes and API documentation, visit [GitHub Releases](https://github.com/kareem2099/dotcommand/releases)
