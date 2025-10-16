import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, Event, EventEmitter, ProviderResult, ThemeIcon, workspace, Command } from 'vscode';
import { CommandStorage } from './storage';
import { SavedCommand } from './types';

export class CommandsTreeDataProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private storage: CommandStorage;

  constructor(storage: CommandStorage) {
    this.storage = storage;
  }

  /**
   * Create prepared command tree items
   */
  private createPreparedCommandItem(name: string, command: string, description: string): TreeItem {
    const item = new TreeItem(name);
    item.description = command;
    item.tooltip = `${description}\n\nRight-click: Run this prepared command`;
    item.iconPath = new ThemeIcon('star');
    item.contextValue = 'preparedCommandItem';
    item.id = `prepared_${command.replace(/[^a-zA-Z0-9]/g, '_')}`;
    item.command = {
      command: 'dotcommand.runPreparedCommand',
      arguments: [item],
      title: 'Run Prepared Command'
    };
    return item;
  }

  /**
   * Get prepared commands for Git category
   */
  private getPreparedGitCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Check Status', 'git status', 'View changes in your working directory'),
      this.createPreparedCommandItem('Stage Changes', 'git add .', 'Stage all changed files'),
      this.createPreparedCommandItem('Commit Changes', 'git commit -m "updates"', 'Commit staged changes with message'),
      this.createPreparedCommandItem('Push to Main', 'git push origin main', 'Push commits to main branch'),
      this.createPreparedCommandItem('Pull from Main', 'git pull origin main', 'Pull changes from main branch'),
      this.createPreparedCommandItem('View History', 'git log --oneline', 'View recent commit history'),
      this.createPreparedCommandItem('Create Branch', 'git checkout -b feature', 'Create and switch to new branch'),
      this.createPreparedCommandItem('Switch Branch', 'git checkout main', 'Switch to existing branch')
    ];
  }

  /**
   * Get prepared commands for NPM category
   */
  private getPreparedNpmCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Install Packages', 'npm install', 'Install all project dependencies'),
      this.createPreparedCommandItem('Start Dev Server', 'npm run dev', 'Run development server'),
      this.createPreparedCommandItem('Build Project', 'npm run build', 'Create production build'),
      this.createPreparedCommandItem('Run Tests', 'npm run test', 'Execute test suite'),
      this.createPreparedCommandItem('Run Linter', 'npm run lint', 'Check code quality'),
      this.createPreparedCommandItem('Add Package', 'npm install package-name', 'Install a specific package'),
      this.createPreparedCommandItem('Update Packages', 'npm update', 'Update all dependencies'),
      this.createPreparedCommandItem('Remove Package', 'npm uninstall package-name', 'Remove a package')
    ];
  }

  /**
   * Get prepared commands for Linux category
   */
  private getPreparedLinuxCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Current Directory', 'pwd', 'Print working directory path'),
      this.createPreparedCommandItem('List Files', 'ls -la', 'List files with detailed information'),
      this.createPreparedCommandItem('Change Directory', 'cd folder', 'Navigate to a folder'),
      this.createPreparedCommandItem('Create Directory', 'mkdir newfolder', 'Create a new directory'),
      this.createPreparedCommandItem('Remove Directory', 'rm -rf folder', 'Remove directory and contents'),
      this.createPreparedCommandItem('Copy File', 'cp file1.txt file2.txt', 'Copy files or directories'),
      this.createPreparedCommandItem('Move File', 'mv file1.txt file2.txt', 'Move or rename files'),
      this.createPreparedCommandItem('View File', 'cat file.txt', 'Display file contents'),
      this.createPreparedCommandItem('Find Files', 'find . -name "*.txt"', 'Search for files by name'),
      this.createPreparedCommandItem('Search Text', 'grep "search" file.txt', 'Search for text in files')
    ];
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item for element
   */
  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  /**
   * Get children for element
   */
  getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
    if (!element) {
      // Root level - show categories and commands
      return this.getRootItems();
    }

    // Handle favorites category
    if (element.contextValue === 'favoritesCategory') {
      return this.getFavoriteCommands();
    }

    // Handle most used category
    if (element.contextValue === 'mostUsedCategory') {
      return this.getMostUsedCommands();
    }

    // Handle trash category
    if (element.contextValue === 'trashCategory') {
      return this.getTrashCommands();
    }

    // Handle category expansion
    const category = element.contextValue === 'category' ? element.label as string : null;
    if (category) {
      // Show commands for this category
      return this.getCommandsForCategory(category);
    }

    // Handle collapsible items if needed in the future
    return [];
  }

  /**
   * Get children for prepared commands view
   */
  public getPreparedViewChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
    if (!element) {
      // Root level - show prepared command categories
      const items: TreeItem[] = [];

      // Git Commands Category
      const gitItem = new TreeItem('🚀 Git Commands', TreeItemCollapsibleState.Collapsed);
      gitItem.iconPath = new ThemeIcon('git-branch');
      gitItem.contextValue = 'preparedCategory';
      gitItem.tooltip = 'Essential Git commands for version control';
      items.push(gitItem);

      // NPM Commands Category
      const npmItem = new TreeItem('📦 NPM Commands', TreeItemCollapsibleState.Collapsed);
      npmItem.iconPath = new ThemeIcon('package');
      npmItem.contextValue = 'preparedCategory';
      npmItem.tooltip = 'Common NPM package management commands';
      items.push(npmItem);

      // Linux Commands Category
      const linuxItem = new TreeItem('🐧 Linux Commands', TreeItemCollapsibleState.Collapsed);
      linuxItem.iconPath = new ThemeIcon('terminal');
      linuxItem.contextValue = 'preparedCategory';
      linuxItem.tooltip = 'Essential Linux system commands';
      items.push(linuxItem);

      return items;
    }

    // Handle expansion of prepared categories
    if (element.contextValue === 'preparedCategory') {
      const label = typeof element.label === 'string' ? element.label : element.label?.label;
      if (label?.includes('Git Commands')) {
        return this.getPreparedGitCommands();
      } else if (label?.includes('NPM Commands')) {
        return this.getPreparedNpmCommands();
      } else if (label?.includes('Linux Commands')) {
        return this.getPreparedLinuxCommands();
      }
    }

    return [];
  }

  /**
   * Get root level items (categories and commands)
   */
  private getRootItems(): TreeItem[] {
    const commands = this.storage.getAllCommands();
    const items: TreeItem[] = [];

    if (commands.length === 0) {
      // Show welcome message when no commands
      const welcomeItem = new TreeItem('No commands saved yet');
      welcomeItem.description = 'Use Ctrl+Shift+S to save your first command';
      welcomeItem.tooltip = 'Click to save your first command';
      welcomeItem.iconPath = '$(add)';
      return [welcomeItem];
    }

    // Always add Favorites section
    const favoriteCommands = commands.filter(cmd => cmd.isFavorite);
    const favoritesItem = new TreeItem('⭐ Favorites', TreeItemCollapsibleState.Collapsed);
    favoritesItem.iconPath = new ThemeIcon('star-full');
    favoritesItem.contextValue = 'favoritesCategory';
    favoritesItem.tooltip = favoriteCommands.length > 0 ? `${favoriteCommands.length} favorite command(s)` : 'No favorite commands yet';
    items.push(favoritesItem);

    // Always add Most Used section
    const mostUsedThreshold = workspace.getConfiguration('dotcommand').get<number>('mostUsedThreshold', 5);
    const mostUsedCommands = commands.filter(cmd => (cmd.usageCount || 0) >= mostUsedThreshold);
    const mostUsedItem = new TreeItem('🔥 Most Used', TreeItemCollapsibleState.Collapsed);
    mostUsedItem.iconPath = new ThemeIcon('flame');
    mostUsedItem.contextValue = 'mostUsedCategory';
    mostUsedItem.tooltip = mostUsedCommands.length > 0 ? `${mostUsedCommands.length} most used command(s)` : 'No most used commands yet';
    items.push(mostUsedItem);

    // Always add Trash section
    const deletedCommands = this.storage.getDeletedCommands();
    const trashItem = new TreeItem('🗑️ Trash', TreeItemCollapsibleState.Collapsed);
    trashItem.iconPath = new ThemeIcon('trash');
    trashItem.contextValue = 'trashCategory';
    trashItem.tooltip = deletedCommands.length > 0 ? `${deletedCommands.length} deleted command(s) - expire in 90 days` : 'No deleted commands in trash';
    items.push(trashItem);

    // Add all commands grouped by category (including favorites and trash)
    // This ensures that even commands that are favorited or in trash still appear in their categories
    const categorizedCommands = this.groupCommandsByCategory(commands);

    // Add category items
    for (const [category, categoryCommands] of categorizedCommands.entries()) {
      if (category) {
        const categoryItem = new TreeItem(category, TreeItemCollapsibleState.Collapsed);
        categoryItem.iconPath = this.getCategoryIcon(category);
        categoryItem.contextValue = 'category';
        categoryItem.tooltip = `${categoryCommands.length} command(s) in ${category}`;
        items.push(categoryItem);
      }
    }

    // Add uncategorized commands
    const uncategorizedCommands = categorizedCommands.get('') || [];
    for (const command of uncategorizedCommands) {
      items.push(this.createCommandItem(command));
    }

    return items;
  }

  /**
   * Group commands by category
   */
  private groupCommandsByCategory(commands: SavedCommand[]): Map<string, SavedCommand[]> {
    const grouped = new Map<string, SavedCommand[]>();

    for (const command of commands) {
      const category = command.category || '';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(command);
    }

    return grouped;
  }

  /**
   * Create tree item for a command
   */
  private createCommandItem(command: SavedCommand, category?: string): TreeItem {
    const item = new TreeItem({
      label: command.name || command.command.substring(0, 50) + (command.command.length > 50 ? '...' : ''),
    });
    item.description = command.command;
    item.tooltip = this.buildCommandTooltip(command);
    item.iconPath = this.getCommandIcon(command);
    item.contextValue = 'commandItem';
    // Create unique ID with category to prevent conflicts across different views
    const categoryPrefix = category ? `${category}_` : '';
    item.id = `${categoryPrefix}cmd_${command.id}`;
    item.command = {
      command: 'dotcommand.runCommandFromTree',
      arguments: [item],
      title: 'Run Command'
    };

    // Add status indicators and category badge
    let statusIndicators = '';
    if (command.isFavorite) statusIndicators += '⭐ ';
    if (command.source === 'auto-terminal') statusIndicators += '🤖 ';
    else if (command.source === 'terminal-history') statusIndicators += '📚 ';

    if (command.category && statusIndicators) {
      item.description = `${statusIndicators}[${command.category}] ${command.command}`;
    } else if (command.category) {
      item.description = `[${command.category}] ${command.command}`;
    } else if (statusIndicators) {
      item.description = `${statusIndicators}${command.command}`;
    }

    return item;
  }

  /**
   * Get command by ID, handling prefixed IDs from tree items
   */
  public getCommandById(id: string): SavedCommand | undefined {
    const commands = this.storage.getAllCommands();

    // Handle prefixed IDs: extract the actual command ID
    let commandId = id;
    if (id.includes('_cmd_')) {
      // For category prefixed IDs like "npm_cmd_123"
      commandId = id.split('_cmd_')[1];
    } else if (id.startsWith('cmd_')) {
      // For simple prefixed IDs like "cmd_123"
      commandId = id.substring(4);
    }

    return commands.find(cmd => cmd.id === commandId);
  }

  /**
   * Get commands for a specific category
   */
  private getCommandsForCategory(category: string): TreeItem[] {
    const commands = this.storage.getAllCommands();
    const categoryCommands = commands.filter(cmd => cmd.category === category);
    return categoryCommands.map(cmd => this.createCommandItem(cmd, category));
  }

  /**
   * Get all commands
   */
  public getAllCommands(): SavedCommand[] {
    return this.storage.getAllCommands();
  }

  /**
   * Get favorite commands
   */
  private getFavoriteCommands(): TreeItem[] {
    const commands = this.storage.getAllCommands();
    const favoriteCommands = commands.filter(cmd => cmd.isFavorite);

    if (favoriteCommands.length === 0) {
      const emptyItem = new TreeItem('No favorite commands yet');
      emptyItem.description = 'Add a star to commands to mark them as favorites';
      emptyItem.tooltip = 'Este su favorite commands will appear here';
      emptyItem.iconPath = new ThemeIcon('star-empty');
      return [emptyItem];
    }

    return favoriteCommands.map(cmd => this.createCommandItem(cmd));
  }

  /**
   * Get recent commands
   */
  private getRecentCommands(): TreeItem[] {
    const commands = this.storage.getAllCommands();
    const recentlyUsed = commands.filter(cmd => cmd.lastUsed)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, 10);
    return recentlyUsed.map(cmd => this.createCommandItem(cmd));
  }

  /**
   * Get most used commands
   */
  private getMostUsedCommands(): TreeItem[] {
    const commands = this.storage.getAllCommands();
    const mostUsedThreshold = workspace.getConfiguration('dotcommand').get<number>('mostUsedThreshold', 5);
    const mostUsed = commands.filter(cmd => (cmd.usageCount || 0) >= mostUsedThreshold)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 10);

    if (mostUsed.length === 0) {
      const emptyItem = new TreeItem('No most used commands yet');
      emptyItem.description = `Commands run ${mostUsedThreshold}+ times will appear here`;
      emptyItem.tooltip = 'Este su frequently used commands will appear here';
      emptyItem.iconPath = new ThemeIcon('flame');
      return [emptyItem];
    }

    return mostUsed.map(cmd => this.createCommandItem(cmd));
  }

  /**
   * Get trash commands
   */
  private getTrashCommands(): TreeItem[] {
    const deletedCommands = this.storage.getDeletedCommands();

    if (deletedCommands.length === 0) {
      const emptyItem = new TreeItem('No deleted commands in trash');
      emptyItem.description = 'Deleted commands will appear here for 90 days';
      emptyItem.tooltip = 'Deleted commands can be restored from here';
      emptyItem.iconPath = new ThemeIcon('search-view-icon');
      return [emptyItem];
    }

    return deletedCommands.map(cmd => this.createTrashCommandItem(cmd));
  }

  /**
   * Create tree item for trashed command
   */
  private createTrashCommandItem(command: SavedCommand): TreeItem {
    const item = new TreeItem({
      label: command.name || command.command.substring(0, 50) + (command.command.length > 50 ? '...' : ''),
    });
    item.description = `${command.command} (deleted ${this.getDaysSinceDeleted(command.deletedAt!)} days ago)`;
    item.tooltip = `Command: ${command.command}\nDeleted: ${new Date(command.deletedAt!).toLocaleString()}\n\nClick to restore from trash`;
    item.iconPath = new ThemeIcon('trash');
    item.contextValue = 'trashCommandItem';
    item.id = `trash_${command.id}`;
    item.command = {
      command: 'dotcommand.restoreCommandFromTrash',
      arguments: [item],
      title: 'Restore Command'
    };

    if (command.category) {
      item.description = `${command.command} [${command.category}] (deleted ${this.getDaysSinceDeleted(command.deletedAt!)} days ago)`;
    }

    return item;
  }

  /**
   * Get days since deleted
   */
  private getDaysSinceDeleted(deletedAt: number): number {
    return Math.floor((Date.now() - deletedAt) / (24 * 60 * 60 * 1000));
  }

  /**
   * Build enhanced tooltip for command
   */
  private buildCommandTooltip(command: SavedCommand): string {
    let tooltip = `Command: ${command.command}`;

    if (command.name) {
      tooltip += `\nName: ${command.name}`;
    }

    if (command.category) {
      tooltip += `\nCategory: ${command.category}`;
    }

    tooltip += `\nSaved: ${new Date(command.timestamp).toLocaleString()}`;

    if (command.lastUsed) {
      tooltip += `\nLast Used: ${new Date(command.lastUsed).toLocaleString()}`;
    }

    if (command.usageCount) {
      tooltip += `\nUsage Count: ${command.usageCount}`;
    }

    if (command.isFavorite) {
      tooltip += `\n⭐ Favorite`;
    }

    if (command.source) {
      const sourceLabels = {
        'manual': 'Manual',
        'auto-terminal': 'Auto-saved from terminal',
        'terminal-history': 'Imported from history'
      };
      tooltip += `\nSource: ${sourceLabels[command.source]}`;
    }

    tooltip += `\n\nDouble-click to run, Right-click for options`;

    return tooltip;
  }

  /**
   * Get appropriate icon for command based on type/category
   */
  private getCommandIcon(command: SavedCommand): string | ThemeIcon {
    // First check if it's a favorite
    if (command.isFavorite) {
      return new ThemeIcon('star-full');
    }

    // Detect command type based on keywords or category
    const cmd = command.command.toLowerCase();

    if (command.category) {
      const category = command.category.toLowerCase();
      if (category.includes('npm') || category.includes('yarn') || category.includes('pnpm')) {
        return new ThemeIcon('package');
      }
      if (category.includes('git')) {
        return new ThemeIcon('git-branch');
      }
      if (category.includes('docker')) {
        return new ThemeIcon('vm');
      }
      if (category.includes('kubernetes') || category.includes('k8s')) {
        return new ThemeIcon('server-process');
      }
      if (category.includes('aws') || category.includes('azure') || category.includes('gcp')) {
        return new ThemeIcon('cloud');
      }
    }

    // Command-based detection
    if (cmd.startsWith('npm ') || cmd.startsWith('yarn ') || cmd.startsWith('pnpm ')) {
      return new ThemeIcon('package');
    }
    if (cmd.startsWith('git ')) {
      return new ThemeIcon('git-branch');
    }
    if (cmd.startsWith('docker ')) {
      return new ThemeIcon('vm');
    }
    if (cmd.startsWith('kubectl ') || cmd.startsWith('helm ')) {
      return new ThemeIcon('server-process');
    }
    if (cmd.includes('aws ') || cmd.includes('terraform')) {
      return new ThemeIcon('cloud');
    }

    // Default to terminal icon
    return '$(terminal)';
  }

  /**
   * Get icon for category
   */
  private getCategoryIcon(category: string): string | ThemeIcon {
    const cat = category.toLowerCase();

    if (cat.includes('npm') || cat.includes('yarn') || cat.includes('pnpm') || cat.includes('package')) {
      return new ThemeIcon('package');
    }
    if (cat.includes('git')) {
      return new ThemeIcon('git-branch');
    }
    if (cat.includes('docker')) {
      return new ThemeIcon('vm');
    }
    if (cat.includes('kubernetes') || cat.includes('k8s')) {
      return new ThemeIcon('server-process');
    }
    if (cat.includes('aws') || cat.includes('azure') || cat.includes('gcp') || cat.includes('cloud')) {
      return new ThemeIcon('cloud');
    }
    if (cat.includes('test') || cat.includes('testing')) {
      return new ThemeIcon('beaker');
    }
    if (cat.includes('build') || cat.includes('compile')) {
      return new ThemeIcon('tools');
    }
    if (cat.includes('deploy')) {
      return new ThemeIcon('rocket');
    }

    // Git task-specific icons
    if (cat.includes('git-')) {
      if (cat.includes('add') || cat.includes('stage')) {
        return new ThemeIcon('add');
      }
      if (cat.includes('status')) {
        return new ThemeIcon('search-view-icon');
      }
      if (cat.includes('diff')) {
        return new ThemeIcon('diff');
      }
      if (cat.includes('commit')) {
        return new ThemeIcon('check');
      }
      if (cat.includes('push')) {
        return new ThemeIcon('arrow-up');
      }
      if (cat.includes('pull') || cat.includes('fetch')) {
        return new ThemeIcon('arrow-down');
      }
      if (cat.includes('merge')) {
        return new ThemeIcon('git-merge');
      }
      if (cat.includes('branch')) {
        return new ThemeIcon('git-branch-create');
      }
      if (cat.includes('reset') || cat.includes('revert')) {
        return new ThemeIcon('discard');
      }
      if (cat.includes('stash')) {
        return new ThemeIcon('archive');
      }
      if (cat.includes('log') || cat.includes('history')) {
        return new ThemeIcon('history');
      }
      if (cat.includes('tag')) {
        return new ThemeIcon('tag');
      }
      return new ThemeIcon('git-branch');
    }

    // NPM task-specific icons
    if (cat.includes('npm-')) {
      if (cat.includes('install')) {
        return new ThemeIcon('add');
      }
      if (cat.includes('scripts')) {
        return new ThemeIcon('play');
      }
      if (cat.includes('test')) {
        return new ThemeIcon('beaker');
      }
      if (cat.includes('lint')) {
        return new ThemeIcon('search');
      }
      if (cat.includes('build')) {
        return new ThemeIcon('tools');
      }
      if (cat.includes('update')) {
        return new ThemeIcon('arrow-up');
      }
      if (cat.includes('publish')) {
        return new ThemeIcon('publish');
      }
      return new ThemeIcon('package');
    }

    // Linux system commands
    if (cat.includes('linux')) {
      if (cat.includes('navigation') || cat.includes('directories')) {
        return new ThemeIcon('folder-opened');
      }
      if (cat.includes('files') || cat.includes('permissions')) {
        return new ThemeIcon('file');
      }
      if (cat.includes('search') || cat.includes('find')) {
        return new ThemeIcon('search-view-icon');
      }
      if (cat.includes('view') || cat.includes('cat')) {
        return new ThemeIcon('output');
      }
      if (cat.includes('editors')) {
        return new ThemeIcon('edit');
      }
      if (cat.includes('network') || cat.includes('ssh')) {
        return new ThemeIcon('globe');
      }
      if (cat.includes('storage') || cat.includes('compression')) {
        return new ThemeIcon('archive');
      }
      if (cat.includes('processes') || cat.includes('system-info')) {
        return new ThemeIcon('dashboard');
      }
      if (cat.includes('user-mgmt')) {
        return new ThemeIcon('account');
      }
      return new ThemeIcon('terminal');
    }

    // Database
    if (cat.includes('database') || cat.includes('sql')) {
      return new ThemeIcon('database');
    }

    // Python
    if (cat.includes('python')) {
      return new ThemeIcon('code');
    }

    // Rust
    if (cat.includes('rust')) {
      return new ThemeIcon('debug-start');
    }

    // Go
    if (cat.includes('go')) {
      return new ThemeIcon('arrow-right');
    }

    // Default folder icon
    return '$(folder)';
  }
}
