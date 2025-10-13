# Changelog

All notable changes to the DotCommand VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-13

### 🚀 **MAJOR OVERHAUL - Enterprise-Grade Command Management**

#### 🎯 **Intelligent Command Organization**
- **🧠 Auto-Categorization**: Commands automatically sorted into specific categories like `git-workspace`, `npm-scripts`, `docker-build`, `k8s-deploy`
- **📊 Usage Tracking**: Commands automatically promoted to "Most Used" after 5 executions
- **🕒 Recent Commands**: Last 10 executed commands shown in dedicated section
- **⭐ Favorites System**: Star important commands for instant access

#### 🗑️ **90-Day Trash Bin System**
- **Safe Deletion**: Commands move to trash instead of permanent deletion
- **Recovery Window**: 90-day restoration period for accidentally deleted commands
- **Auto-Cleanup**: Expired trash (>90 days) automatically removed
- **Visual Indicators**: Trash items show deletion time

#### 🌳 **Enhanced Tree View UI**
- **Smart Sections**: Favorites, Recent, and Trash folders with appropriate icons
- **Context Menus**: Right-click access to all operations (run, copy, favorite, delete)
- **Category Icons**: Visual grouping with git-branch, package, vm, cloud icons
- **Status Badges**: Emoji indicators for favorites (⭐), auto-saved (🤖), terminal-history (📚)

#### ⚡ **Powerful Command Actions**
- **Double-Click Execution**: Run commands directly from tree view
- **Terminal Integration**: Executes in active VS Code terminal
- **Clipboard Operations**: One-click clipboard copy with feedback
- **Bulk Operations**: Multi-select for complex actions

#### 🤖 **Terminal AI Learning**
- **Auto-Capture**: Learns meaningful commands from terminal sessions
- **Smart Filtering**: Excludes navigation commands (cd, ls, pwd)
- **Instant Categorization**: New commands organized automatically
- **Silent Operation**: Background processing with optional notifications

#### 🏗️ **Complete Architecture Redesign**
- **Modular Structure**: 11 separate files with single responsibilities
- **Enterprise Patterns**: Clean separation of concerns, dependency injection
- **Type Safety**: Full TypeScript coverage with comprehensive interfaces
- **Error Resilience**: Robust validation and user feedback systems

### 🔧 **Configuration Enhancements**
- `dotcommand.general.maxCommands`: Maximum stored commands (default: 1000)
- `dotcommand.autoSave.enabled`: Terminal learning toggle
- `dotcommand.autoSave.minLength`: Minimum command length (default: 2)
- `dotcommand.mostUsedThreshold`: Executions for "Most Used" promotion (default: 5)

### 🐛 **Fixed Issues**
- All function handlers now work correctly (run, copy, delete, toggle favorite)
- Tree item ID conflicts resolved for different view categories
- Command registration failures eliminated
- VS Code API compatibility ensured

## [1.0.0] - 2025-01-13

### 🏗️ **Initial Release**
- ✅ **Save Command Feature** - Save any command with optional name and category
- ✅ **View & Copy Commands** - Browse saved commands in webview interface
- ✅ **Delete Command** - Remove unwanted commands with confirmation
- ✅ **Search & Filter** - Real-time search functionality
- ✅ **Keyboard Shortcuts** - `Ctrl+Shift+S` (save) and `Ctrl+Shift+V` (view)
- ✅ **Auto-detection** - Automatically detects selected text or current line
- ✅ **Persistent Storage** - Commands saved in VS Code's global state
- ✅ **Categories** - Organize commands with custom categories
- ✅ **Cross-platform Support** - Works on Windows, Linux, and Mac
- ✅ **Modern UI** - Clean, VS Code-themed interface
- ✅ **Error Handling** - Comprehensive validation and user feedback
- ✅ **TypeScript Support** - Full type safety throughout the extension

### 🛠️ **Technical Foundation**
- **VS Code Extension API** - Native integration
- **Webview API** - Custom command browser interface
- **Global State API** - Persistent data storage
- **Modern Async/Await** - Clean asynchronous code patterns
- **Input Validation** - Prevents invalid commands
- **Duplicate Detection** - Warns before saving duplicates

## [Unreleased]

### 📋 **Planned Enhancements**
- 🔄 **Command Templates** - Save commands with dynamic placeholders
- 🔄 **Import/Export** - Backup and sync command collections
- 🔄 **Advanced Search** - Filters, sorting, and advanced queries
- 🔄 **Keyboard Maestro Mode** - Chain commands with keyboard navigation
- 🔄 **Cloud Sync** - Cross-device command synchronization
- 🔄 **Analytics Dashboard** - Usage statistics and insights
- 🔄 **Plugin Architecture** - Third-party command providers and themes

---

**🎉 DotCommand now provides enterprise-grade command management with brain-like organization, automatic learning, and 90-day safety nets!**

*For more detailed technical changes and API documentation, visit [GitHub Releases](https://github.com/kareem2099/dotcommand/releases)*
