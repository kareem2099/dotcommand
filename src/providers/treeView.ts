import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, Event, EventEmitter, ProviderResult, ThemeIcon, workspace } from 'vscode';
import { CommandStorage } from '../storage/storage';
import { SavedCommand } from '../utils/types';
import { getPreparedCommandCategories, getPreparedCommandsForCategory } from '../commands/prepared';
import { getTemplateManager } from '../utils/commandTemplates';
import {
  SearchFilterState,
  DEFAULT_SEARCH_FILTER_STATE,
  loadFilterState,
  saveFilterState,
  clearFilterState,
  filterSavedCommands,
  STORAGE_KEYS
} from '../utils/searchFilter';

export class CommandsTreeDataProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private storage: CommandStorage;
  private _searchFilterState: SearchFilterState;

  constructor(storage: CommandStorage) {
    this.storage = storage;
    this._searchFilterState = loadFilterState(STORAGE_KEYS.MY_COMMANDS_FILTER);

    // Enhanced file system monitoring for Smart Context Awareness
    const watcher = workspace.createFileSystemWatcher('**/*');
    watcher.onDidCreate(() => this.refreshContextAndTree());
    watcher.onDidDelete(() => this.refreshContextAndTree());

    // Workspace folder changes
    workspace.onDidChangeWorkspaceFolders(() => this.refreshContextAndTree());

    // Force refresh on startup (nuclear option for reliability!)
    setTimeout(() => this.refreshContextAndTree(), 1000);
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
   * Refresh context detection and tree view when files change
   */
  public refreshContextAndTree(): void {
    console.log('🔄 Refreshing Context and Tree...'); // Debug log
    try {
      const templateManager = getTemplateManager();
      templateManager.refreshContext(); // Invalidate cache for immediate re-scan
      this.refresh(); // Refresh the tree view
      console.log('✅ Context and Tree refreshed successfully'); // Debug log
    } catch (error) {
      console.error('❌ Error refreshing context and tree:', error);
    }
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
  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Root level - show categories and commands
      return await this.getRootItems();
    }

    // Handle suggested templates expansion
    if (element.contextValue === 'suggestionGroup') {
      try {
        const templateManager = getTemplateManager();
        const suggestions = await templateManager.getSuggestedTemplates(5);

        return suggestions.map(template => {
          const item = new TreeItem(template.name);
          item.description = `(Score: ${template.relevanceScore})`;
          item.tooltip = `${template.description}\n\nCommand: ${template.template}`;
          item.iconPath = new ThemeIcon('lightbulb');
          item.contextValue = 'commandTemplate';

          // Execute template on click
          item.command = {
            command: 'dotcommand.executeCommandTemplate',
            title: 'Execute Template',
            arguments: [template.id]
          };

          return item;
        });
      } catch (error) {
        console.error('Error loading suggested templates:', error);
        return [];
      }
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
      const categories = getPreparedCommandCategories();

      // Create category icons mapping
      const categoryIcons: { [key: string]: ThemeIcon } = {
        'Git Commands': new ThemeIcon('git-branch'),
        'NPM Commands': new ThemeIcon('package'),
        'Yarn Commands': new ThemeIcon('package'),
        'Python Commands': new ThemeIcon('code'),
        'Docker Commands': new ThemeIcon('vm'),
        'Kubernetes Commands': new ThemeIcon('server-process'),
        'Linux Commands': new ThemeIcon('terminal'),
        'Database Commands': new ThemeIcon('database'),
        'Code Quality Commands': new ThemeIcon('checklist'),
        'Testing Commands': new ThemeIcon('beaker'),
        'Deployment Commands': new ThemeIcon('rocket')
      };

      // Create tooltips mapping
      const categoryTooltips: { [key: string]: string } = {
        'Git Commands': 'Essential Git commands for version control',
        'NPM Commands': 'Common NPM package management commands',
        'Yarn Commands': 'Yarn package manager commands',
        'Python Commands': 'Python development and pip commands',
        'Docker Commands': 'Docker container management commands',
        'Kubernetes Commands': 'Kubernetes orchestration commands',
        'Linux Commands': 'Essential Linux system commands',
        'Database Commands': 'Database connection and management commands',
        'Code Quality Commands': 'Linting and code formatting tools',
        'Testing Commands': 'Testing framework commands',
        'Deployment Commands': 'Deployment and hosting platform commands'
      };

      // Create emoji prefixes mapping
      const categoryEmojis: { [key: string]: string } = {
        'Git Commands': '🚀',
        'NPM Commands': '📦',
        'Yarn Commands': '🧶',
        'Python Commands': '🐍',
        'Docker Commands': '🐳',
        'Kubernetes Commands': '☸️',
        'Linux Commands': '🐧',
        'Database Commands': '🗄️',
        'Code Quality Commands': '✨',
        'Testing Commands': '🧪',
        'Deployment Commands': '🚀'
      };

      for (const category of categories) {
        const commands = getPreparedCommandsForCategory(category);
        if (commands.length > 0) {
          const displayName = `${categoryEmojis[category] || '📁'} ${category}`;
          const categoryItem = new TreeItem(displayName, TreeItemCollapsibleState.Collapsed);
          categoryItem.iconPath = categoryIcons[category] || new ThemeIcon('folder');
          categoryItem.contextValue = 'preparedCategory';
          categoryItem.tooltip = categoryTooltips[category] || `${category} commands`;
          items.push(categoryItem);
        }
      }

      return items;
    }

    // Handle expansion of prepared categories
    if (element.contextValue === 'preparedCategory') {
      const label = typeof element.label === 'string' ? element.label : element.label?.label;
      if (label) {
        // Extract category name from display label (remove emoji prefix)
        const categoryMatch = label?.match(/^[^a-zA-Z]*(.+)$/);
        const categoryName = categoryMatch ? categoryMatch[1].trim() : label;
        return this.getPreparedCommandsForCategory(categoryName);
      }
    }

    return [];
  }

  /**
   * Get root level items (categories and commands)
   */
  private async getRootItems(): Promise<TreeItem[]> {
    const commands = this.storage.getAllCommands();
    const items: TreeItem[] = [];

    // ⚡ FIRST: Add suggested templates section if available
    try {
      const templateManager = getTemplateManager();
      const suggestions = await templateManager.getSuggestedTemplates(5);

      if (suggestions.length > 0) {
        const suggestionItem = new TreeItem('⚡ Suggested for Workspace', TreeItemCollapsibleState.Expanded);
        suggestionItem.contextValue = 'suggestionGroup';
        suggestionItem.description = 'Smart Context';
        suggestionItem.tooltip = 'Commands suggested based on your project files';
        suggestionItem.iconPath = new ThemeIcon('lightbulb');
        items.push(suggestionItem);
      }
    } catch (error) {
      console.error('Error fetching suggestions for tree:', error);
    }

    if (commands.length === 0 && items.length === 0) {
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
        // Apply search/filter if active
        const filteredCommands = this._searchFilterState.isActive
          ? filterSavedCommands(categoryCommands, this._searchFilterState)
          : categoryCommands;

        // Only show category if it has commands after filtering
        if (!this._searchFilterState.isActive || filteredCommands.length > 0) {
          const categoryItem = new TreeItem(category, TreeItemCollapsibleState.Collapsed);
          categoryItem.iconPath = this.getCategoryIcon(category);
          categoryItem.contextValue = 'category';
          const commandCount = this._searchFilterState.isActive ? filteredCommands.length : categoryCommands.length;
          categoryItem.tooltip = `${commandCount} command(s) in ${category}`;
          items.push(categoryItem);
        }
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

    // Apply search/filter if active
    const filteredCommands = this._searchFilterState.isActive
      ? filterSavedCommands(categoryCommands, this._searchFilterState)
      : categoryCommands;

    return filteredCommands.map(cmd => this.createCommandItem(cmd, category));
  }

  /**
   * Get prepared commands for a specific category
   */
  private getPreparedCommandsForCategory(categoryName: string): TreeItem[] {
    const preparedCommands = getPreparedCommandsForCategory(categoryName);
    return preparedCommands.map(cmd => {
      const item = new TreeItem(cmd.name);
      item.description = cmd.command;
      item.tooltip = `${cmd.description}\n\nRight-click: Run this prepared command`;
      // Match context value to what command handlers expect
      item.contextValue = 'preparedCommandItem';
      item.id = `prepared_${cmd.command.replace(/[^a-zA-Z0-9]/g, '_')}`;
      item.command = {
        command: 'dotcommand.runPreparedCommand',
        arguments: [item],
        title: 'Run Prepared Command'
      };
      // Set appropriate icon based on category
      const cat = categoryName.toLowerCase();
      if (cat.includes('git')) item.iconPath = new ThemeIcon('git-branch');
      else if (cat.includes('npm') || cat.includes('yarn')) item.iconPath = new ThemeIcon('package');
      else if (cat.includes('docker')) item.iconPath = new ThemeIcon('vm');
      else if (cat.includes('python')) item.iconPath = new ThemeIcon('code');
      else if (cat.includes('database')) item.iconPath = new ThemeIcon('database');
      else if (cat.includes('test')) item.iconPath = new ThemeIcon('beaker');
      else if (cat.includes('deploy')) item.iconPath = new ThemeIcon('rocket');
      else if (cat.includes('linux')) item.iconPath = new ThemeIcon('terminal');
      else item.iconPath = new ThemeIcon('terminal');

      return item;
    });
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

    // Apply search/filter if active
    const filteredCommands = this._searchFilterState.isActive
      ? filterSavedCommands(favoriteCommands, this._searchFilterState)
      : favoriteCommands;

    if (filteredCommands.length === 0) {
      const emptyItem = new TreeItem('No favorite commands yet');
      emptyItem.description = 'Add a star to commands to mark them as favorites';
      emptyItem.tooltip = 'Este su favorite commands will appear here';
      emptyItem.iconPath = new ThemeIcon('star-empty');
      return [emptyItem];
    }

    return filteredCommands.map(cmd => this.createCommandItem(cmd));
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

    // Apply search/filter if active
    const filteredCommands = this._searchFilterState.isActive
      ? filterSavedCommands(mostUsed, this._searchFilterState)
      : mostUsed;

    if (filteredCommands.length === 0) {
      const emptyItem = new TreeItem('No most used commands yet');
      emptyItem.description = `Commands run ${mostUsedThreshold}+ times will appear here`;
      emptyItem.tooltip = 'Este su frequently used commands will appear here';
      emptyItem.iconPath = new ThemeIcon('flame');
      return [emptyItem];
    }

    return filteredCommands.map(cmd => this.createCommandItem(cmd));
  }

  /**
   * Get trash commands
   */
  private getTrashCommands(): TreeItem[] {
    const deletedCommands = this.storage.getDeletedCommands();

    // Apply search/filter if active
    const filteredCommands = this._searchFilterState.isActive
      ? filterSavedCommands(deletedCommands, this._searchFilterState)
      : deletedCommands;

    if (filteredCommands.length === 0) {
      const emptyItem = new TreeItem('No deleted commands in trash');
      emptyItem.description = 'Deleted commands will appear here for 90 days';
      emptyItem.tooltip = 'Deleted commands can be restored from here';
      emptyItem.iconPath = new ThemeIcon('search-view-icon');
      return [emptyItem];
    }

    return filteredCommands.map(cmd => this.createTrashCommandItem(cmd));
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

  /**
   * Set search/filter state and refresh the tree
   */
  public setSearchFilterState(state: SearchFilterState): void {
    this._searchFilterState = state;
    saveFilterState(STORAGE_KEYS.MY_COMMANDS_FILTER, state);
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Get current search/filter state
   */
  public getSearchFilterState(): SearchFilterState {
    return { ...this._searchFilterState };
  }

  /**
   * Clear search/filter and refresh the tree
   */
  public clearSearchFilter(): void {
    this._searchFilterState = { ...DEFAULT_SEARCH_FILTER_STATE };
    clearFilterState(STORAGE_KEYS.MY_COMMANDS_FILTER);
    this._onDidChangeTreeData.fire(undefined);
  }
}
