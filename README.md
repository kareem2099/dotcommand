# DotCommand - VS Code Extension

**Intelligent Command Management with Brain-like Organization** 🧠

A powerful VS Code extension that learns your terminal habits, intelligently organizes commands, and provides enterprise-grade command management with 90-day trash recovery.

## 🔥 Features

### 🏗️ **Smart Organization**
✅ **Auto-Categorization** - Commands automatically sorted into `git-workspace`, `npm-scripts`, `docker-build`, etc.
✅ **Recent & Most Used** - Commands promoted to special sections based on usage patterns
✅ **Favorites System** - Star important commands for instant access
✅ **90-Day Trash Bin** - Safe deletion with full restore capability

### ⚡ **Powerful Actions**
✅ **Double-Click to Run** - Execute commands directly from tree view
✅ **Copy to Clipboard** - Instant clipboard access with visual feedback
✅ **Terminal Auto-Save** - Learns commands from your terminal sessions
✅ **Bulk Operations** - Multi-select delete, bulk restore from trash

### 🧠 **Intelligent Management**
✅ **Usage Tracking** - Commands automatically promoted to "Most Used" after 5 executions
✅ **Smart Cleanup** - Automatic garbage collection while preserving valuable commands
✅ **Context Menus** - Right-click actions for all operations
✅ **Rich Tooltips** - Comprehensive metadata display with usage stats

### 🌐 **Modern UI**
✅ **Tree View Integration** - Native VS Code sidebar with smart icons
✅ **Category-Based Folders** - Visual grouping with appropriate icons
✅ **Status Indicators** - Emoji badges show favorites, auto-saved, etc.
✅ **Web View Support** - Rich interface for complex operations

## Keyboard Shortcuts

- **Ctrl+Shift+S** (Windows/Linux) or **Cmd+Shift+S** (Mac) - Save a new command
- **Ctrl+Shift+V** (Windows/Linux) or **Cmd+Shift+V** (Mac) - View and copy commands

## Usage

### Saving Commands

1. Select text in your editor (optional)
2. Press **Ctrl+Shift+S** (or **Cmd+Shift+S** on Mac)
3. Enter the command (pre-filled if you had text selected)
4. Optionally add a name and category for better organization
5. Press Enter to save

### Viewing and Using Commands

1. Press **Ctrl+Shift+V** (or **Cmd+Shift+V** on Mac)
2. Browse your saved commands in the tree view sidebar
3. **Double-click commands** to run them directly in terminal
4. **Right-click commands** for context menu options:
   - 🔄 **Run Command** - Execute in active terminal
   - 📋 **Copy Command** - Copy to clipboard
   - ⭐ **Toggle Favorite** - Star/unstar for quick access
   - 🗑️ **Delete Command** - Move to trash (recoverable within 90 days)

### Intelligent Organization

#### 🌟 **Smart Sections**
- **⭐ Favorites** - Starred commands for instant access
- **🕒 Recent** - Last 10 executed commands
- **🗑️ Trash** - Deleted commands (90-day restoration window)

#### 📂 **Auto-Categories**
Commands are automatically categorized based on keywords:
- `git-workspace` → `git status`, `git add .`, `git diff`
- `npm-scripts` → `npm run dev`, `npm run build`
- `docker-build` → `docker build`, `docker-compose up`
- `k8s-deploy` → `kubectl apply`, `helm install`

#### 🎯 **Usage-Based Promotion**
- Commands used **5+ times** automatically move to "Most Used" category
- Commands used in **last 30 days** appear in Recent section
- **Favorites always preserved** during cleanup operations

### 💡 **Advanced Features**

#### 🗑️ **Trash Bin Recovery**
- Deleted commands go to trash (not permanently lost)
- **90-day recovery window** - restore anytime
- **Auto-cleanup** removes trash after 90 days
- **Visual indicators** show deletion time

#### 🤖 **Terminal Learning**
- Automatically captures meaningful terminal commands
- Filters out navigation commands (`cd`, `ls`, `pwd`)
- Categorizes and organizes new commands instantly
- **Silent operation** with optional notifications

#### ⚙️ **Configuration Options**
```json
{
  "dotcommand.general.maxCommands": 1000,
  "dotcommand.autoSave.enabled": true,
  "dotcommand.autoSave.minLength": 2,
  "dotcommand.mostUsedThreshold": 5
}
```

## Examples

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

## Installation

1. Open this project in VS Code
2. Press **F5** to run the extension in development mode
3. The extension will be installed in a new "Extension Development Host" window

## Development

### 🏗️ **Project Structure**

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

### Building

```bash
npm install    # Install dependencies
npm run compile # Compile TypeScript to JavaScript
```

### Publishing

1. Update version in `package.json`
2. Run `npm run compile`
3. Package with `vsce package`
4. Publish with `vsce publish`

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute to this project.

## License

MIT License - feel free to use this project as you wish.

## Support

If you find this extension helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or issues
- 💡 Suggesting new features
- ☕ Buying me a coffee

---

**Happy coding! 🚀**
