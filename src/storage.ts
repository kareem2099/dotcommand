import { ExtensionContext } from 'vscode';
import { SavedCommand, CommandInput } from './types';

export class CommandStorage {
  private static readonly STORAGE_KEY = 'dotcommand.savedCommands';

  constructor(private context: ExtensionContext) {}

  /**
   * Save a new command to storage
   */
  async saveCommand(input: CommandInput): Promise<SavedCommand> {
    const commands = this.getAllCommandsIncludingDeleted();

    const newCommand: SavedCommand = {
      id: this.generateId(),
      name: input.name?.trim() || undefined,
      command: input.command.trim(),
      timestamp: Date.now(),
      category: input.category?.trim() || undefined,
    };

    // Validate that command is not empty
    if (!newCommand.command) {
      throw new Error('Command cannot be empty');
    }

    commands.push(newCommand);

    // Run intelligent cleanup when approaching limit
    const maxCommands = 1000; // Default limit, configurable
    if (this.getActiveCommandCount() >= maxCommands) {
      await this.intelligentCleanup(commands);
    }

    await this.saveAllCommands(commands);

    return newCommand;
  }

  /**
   * Get all saved commands (excluding soft-deleted)
   */
  getAllCommands(): SavedCommand[] {
    const commands = this.context.globalState.get<SavedCommand[]>(CommandStorage.STORAGE_KEY, []);
    // Filter out soft-deleted commands and sort by timestamp (most recent first)
    return commands.filter(cmd => cmd.deletedAt === undefined)
      .sort((a: SavedCommand, b: SavedCommand) => b.timestamp - a.timestamp);
  }

  /**
   * Get all commands including soft-deleted (for restore)
   */
  getAllCommandsIncludingDeleted(): SavedCommand[] {
    const commands = this.context.globalState.get<SavedCommand[]>(CommandStorage.STORAGE_KEY, []);
    return commands.sort((a: SavedCommand, b: SavedCommand) => b.timestamp - a.timestamp);
  }

  /**
   * Get soft-deleted commands (trash)
   */
  getDeletedCommands(): SavedCommand[] {
    const commands = this.context.globalState.get<SavedCommand[]>(CommandStorage.STORAGE_KEY, []);
    return commands.filter(cmd => cmd.deletedAt !== undefined)
      .sort((a: SavedCommand, b: SavedCommand) => b.deletedAt! - a.deletedAt!);
  }

  /**
   * Delete a command by ID
   */
  async deleteCommand(id: string): Promise<boolean> {
    const commands = this.getAllCommands();
    const filteredCommands = commands.filter(cmd => cmd.id !== id);

    if (filteredCommands.length === commands.length) {
      return false; // Command not found
    }

    await this.saveAllCommands(filteredCommands);
    return true;
  }

  /**
   * Update an existing command
   */
  async updateCommand(id: string, updates: Partial<CommandInput>): Promise<SavedCommand | null> {
    const commands = this.getAllCommands();
    const index = commands.findIndex(cmd => cmd.id === id);

    if (index === -1) {
      return null; // Command not found
    }

    const updatedCommand: SavedCommand = {
      ...commands[index],
      ...updates,
      id, // Preserve the original ID
      timestamp: Date.now(), // Update timestamp
    };

    // Validate that command is not empty
    if (!updatedCommand.command.trim()) {
      throw new Error('Command cannot be empty');
    }

    commands[index] = updatedCommand;
    await this.saveAllCommands(commands);

    return updatedCommand;
  }

  /**
   * Search commands by name or command content
   */
  searchCommands(query: string): SavedCommand[] {
    const commands = this.getAllCommands();
    const lowerQuery = query.toLowerCase();

    return commands.filter(cmd =>
      (cmd.name?.toLowerCase().includes(lowerQuery)) ||
      cmd.command.toLowerCase().includes(lowerQuery) ||
      (cmd.category?.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category?: string): SavedCommand[] {
    if (!category) {
      return this.getAllCommands();
    }

    return this.getAllCommands().filter(cmd => cmd.category === category);
  }

  /**
   * Clear all commands
   */
  async clearAllCommands(): Promise<void> {
    await this.saveAllCommands([]);
  }

  /**
   * Get total number of saved commands
   */
  getCommandCount(): number {
    return this.getAllCommands().length;
  }

  /**
   * Check if a command already exists (by content)
   */
  commandExists(command: string): boolean {
    const commands = this.getAllCommands();
    return commands.some(cmd => cmd.command.trim() === command.trim());
  }

  /**
   * Generate a unique ID for a command
   */
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active (non-deleted) command count
   */
  private getActiveCommandCount(): number {
    const commands = this.context.globalState.get<SavedCommand[]>(CommandStorage.STORAGE_KEY, []);
    return commands.filter(cmd => cmd.deletedAt === undefined).length;
  }

  /**
   * Intelligent cleanup when storage limit is reached
   */
  private async intelligentCleanup(commands: SavedCommand[]): Promise<void> {
    const NOW = Date.now();
    const MAX_COMMANDS = 1000;
    const TRASH_RETENTION_DAYS = 90;

    // Clean up expired trash (90 days old)
    const expiredTrash = commands.filter(cmd =>
      cmd.deletedAt && (NOW - cmd.deletedAt) > (TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    );

    if (expiredTrash.length > 0) {
      // Remove permanently expired trash
      commands = commands.filter(cmd => !expiredTrash.includes(cmd));
    }

    // Get active commands (not in trash)
    const activeCommands = commands.filter(cmd => cmd.deletedAt === undefined);

    // If still over limit, move least valuable commands to trash
    if (activeCommands.length >= MAX_COMMANDS) {
      // Identify commands to preserve:
      // 1. Favorites (always keep)
      // 2. Recent (last 30 days)
      // 3. Most used (10+ usages)

      const preserveCommands = activeCommands.filter(cmd =>
        cmd.isFavorite || // Favorites
        (cmd.lastUsed && (NOW - cmd.lastUsed) < (30 * 24 * 60 * 60 * 1000)) || // Recent (30 days)
        (cmd.usageCount && cmd.usageCount >= 10) // Most used (10+)
      );

      // Commands to trash (least valuable)
      const trashCandidates = activeCommands.filter(cmd => !preserveCommands.includes(cmd));

      // Sort by value (most valuable first) and trash the least
      trashCandidates.sort((a, b) => {
        // Score based on age, usage, recency
        const scoreA = (a.usageCount || 0) + ((a.lastUsed ? (NOW - a.lastUsed) : Infinity) / (24 * 60 * 60 * 1000));
        const scoreB = (b.usageCount || 0) + ((b.lastUsed ? (NOW - b.lastUsed) : Infinity) / (24 * 60 * 60 * 1000));
        return scoreA - scoreB; // Lower score = more valuable, keep first
      });

      // Move least valuable to trash
      const commandsToTrash = trashCandidates.slice(0, activeCommands.length - MAX_COMMANDS + 100); // Keep buffer

      commandsToTrash.forEach(cmd => {
        cmd.deletedAt = NOW;
        console.log(`Moved to trash: ${cmd.command}`);
      });
    }

    console.log(`Intelligent cleanup completed. Active commands: ${commands.filter(c => !c.deletedAt).length}`);
  }

  /**
   * Restore a command from trash
   */
  async restoreCommand(id: string): Promise<boolean> {
    const commands = this.getAllCommandsIncludingDeleted();
    const commandIndex = commands.findIndex(cmd => cmd.id === id);

    if (commandIndex === -1 || !commands[commandIndex].deletedAt) {
      return false; // Command not found or not in trash
    }

    // Remove deletedAt to restore
    commands[commandIndex].deletedAt = undefined;
    await this.saveAllCommands(commands);
    return true;
  }

  /**
   * Permanently delete old trash
   */
  async emptyTrash(): Promise<void> {
    const NOW = Date.now();
    const TRASH_RETENTION_DAYS = 90;
    const commands = this.getAllCommandsIncludingDeleted();

    // Remove commands deleted more than 90 days ago
    const activeCommands = commands.filter(cmd =>
      !cmd.deletedAt || (NOW - cmd.deletedAt) <= (TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    );

    await this.saveAllCommands(activeCommands);
  }

  /**
   * Get trash statistics
   */
  getTrashStats(): { count: number; oldestDays: number; totalSize: number } {
    const deletedCommands = this.getDeletedCommands();
    const NOW = Date.now();

    return {
      count: deletedCommands.length,
      oldestDays: deletedCommands.length > 0
        ? Math.floor((NOW - deletedCommands[deletedCommands.length - 1].deletedAt!) / (24 * 60 * 60 * 1000))
        : 0,
      totalSize: deletedCommands.length
    };
  }

  /**
   * Save all commands to VS Code's global state
   */
  private async saveAllCommands(commands: SavedCommand[]): Promise<void> {
    await this.context.globalState.update(CommandStorage.STORAGE_KEY, commands);
  }
}
