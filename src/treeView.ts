import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, Event, EventEmitter, ProviderResult, ThemeIcon } from 'vscode';
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

    // Handle recent category
    if (element.contextValue === 'recentCategory') {
      return this.getRecentCommands();
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

    // Add Favorites section if there are favorites
    const favoriteCommands = commands.filter(cmd => cmd.isFavorite);
    if (favoriteCommands.length > 0) {
      const favoritesItem = new TreeItem('⭐ Favorites', TreeItemCollapsibleState.Collapsed);
      favoritesItem.iconPath = new ThemeIcon('star-full');
      favoritesItem.contextValue = 'favoritesCategory';
      favoritesItem.tooltip = `${favoriteCommands.length} favorite command(s)`;
      items.push(favoritesItem);
    }

    // Add Recently Used section
    const recentlyUsed = commands.filter(cmd => cmd.lastUsed)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, 10);
    if (recentlyUsed.length > 0) {
      const recentItem = new TreeItem('🕒 Recent', TreeItemCollapsibleState.Collapsed);
      recentItem.iconPath = new ThemeIcon('history');
      recentItem.contextValue = 'recentCategory';
      recentItem.tooltip = `${recentlyUsed.length} recently used command(s)`;
      items.push(recentItem);
    }

    // Add Trash section if there are deleted commands
    const deletedCommands = this.storage.getDeletedCommands();
    if (deletedCommands.length > 0) {
      const trashItem = new TreeItem('🗑️ Trash', TreeItemCollapsibleState.Collapsed);
      trashItem.iconPath = new ThemeIcon('trash');
      trashItem.contextValue = 'trashCategory';
      trashItem.tooltip = `${deletedCommands.length} deleted command(s) - expire in 90 days`;
      items.push(trashItem);
    }

    // Group commands by category
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
   * Get trash commands
   */
  private getTrashCommands(): TreeItem[] {
    const deletedCommands = this.storage.getDeletedCommands();
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

    // Default folder icon
    return '$(folder)';
  }
}
