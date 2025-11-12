import { ExtensionContext, commands } from 'vscode';
import { CommandStorage } from '../storage/storage';

export interface ExecutedCommand {
  id: string;
  command: string;
  timestamp: number;
  category?: string;
  source: 'saved' | 'prepared' | 'terminal' | 'manual' | 'template';
  terminalName?: string;
  success?: boolean;
  executionTime?: number;
}

export interface CommandHistoryStats {
  totalCommands: number;
  todayCommands: number;
  weekCommands: number;
  favoriteCommands: number;
  mostUsedCommand: ExecutedCommand | null;
}

/**
 * Global command history manager
 */
export class CommandHistoryManager {
  private static readonly STORAGE_KEY = 'dotcommand.commandHistory';
  private static readonly MAX_HISTORY_SIZE = 1000;
  private context: ExtensionContext;
  private storage: CommandStorage;

  constructor(context: ExtensionContext, storage: CommandStorage) {
    this.context = context;
    this.storage = storage;
  }

  /**
   * Track command execution
   */
  async trackCommand(command: string, source: ExecutedCommand['source'], terminalName?: string, category?: string): Promise<void> {
    const executedCommand: ExecutedCommand = {
      id: this.generateId(),
      command: command.trim(),
      timestamp: Date.now(),
      category,
      source,
      terminalName
    };

    const history = this.getHistory();
    history.unshift(executedCommand); // Add to beginning

    // Keep only the most recent commands
    if (history.length > CommandHistoryManager.MAX_HISTORY_SIZE) {
      history.splice(CommandHistoryManager.MAX_HISTORY_SIZE);
    }

    await this.saveHistory(history);
  }

  /**
   * Get command history with optional filtering
   */
  getHistory(options?: {
    limit?: number;
    source?: ExecutedCommand['source'];
    category?: string;
    since?: number; // timestamp
    terminalName?: string;
  }): ExecutedCommand[] {
    let history = this.context.globalState.get<ExecutedCommand[]>(CommandHistoryManager.STORAGE_KEY, []);

    if (options?.source) {
      history = history.filter(cmd => cmd.source === options.source);
    }

    if (options?.category) {
      history = history.filter(cmd => cmd.category === options.category);
    }

    if (options?.since) {
      history = history.filter(cmd => cmd.timestamp >= options.since!);
    }

    if (options?.terminalName) {
      history = history.filter(cmd => cmd.terminalName === options.terminalName);
    }

    if (options?.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  /**
   * Search command history
   */
  searchHistory(query: string, limit: number = 50): ExecutedCommand[] {
    const history = this.getHistory();
    const lowerQuery = query.toLowerCase();

    return history
      .filter(cmd => cmd.command.toLowerCase().includes(lowerQuery))
      .slice(0, limit);
  }

  /**
   * Get recently used commands
   */
  getRecentCommands(limit: number = 20): ExecutedCommand[] {
    return this.getHistory({ limit });
  }

  /**
   * Get today's command history
   */
  getTodayCommands(): ExecutedCommand[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getHistory({ since: today.getTime() });
  }

  /**
   * Get command history statistics
   */
  getStats(): CommandHistoryStats {
    const history = this.getHistory();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = today.getTime() - (7 * 24 * 60 * 60 * 1000);

    // Count commands by frequency
    const commandCounts = new Map<string, number>();
    let mostUsedCommand: ExecutedCommand | null = null;
    let maxCount = 0;

    history.forEach(cmd => {
      const count = commandCounts.get(cmd.command) || 0;
      commandCounts.set(cmd.command, count + 1);

      if (count + 1 > maxCount) {
        maxCount = count + 1;
        mostUsedCommand = cmd;
      }
    });

    const savedCommands = this.storage.getAllCommands();
    const favoriteCommands = savedCommands.filter(cmd => cmd.isFavorite).length;

    return {
      totalCommands: history.length,
      todayCommands: history.filter(cmd => cmd.timestamp >= today.getTime()).length,
      weekCommands: history.filter(cmd => cmd.timestamp >= weekAgo).length,
      favoriteCommands,
      mostUsedCommand
    };
  }

  /**
   * Clear command history
   */
  async clearHistory(olderThan?: number): Promise<void> {
    let history = this.getHistory();

    if (olderThan) {
      history = history.filter(cmd => cmd.timestamp >= olderThan);
    } else {
      history = [];
    }

    await this.saveHistory(history);
  }

  /**
   * Get command suggestions based on history
   */
  getSuggestions(prefix: string, limit: number = 10): string[] {
    const history = this.getHistory();
    const suggestions = new Set<string>();

    // Find commands that start with the prefix
    history.forEach(cmd => {
      if (cmd.command.startsWith(prefix) && !suggestions.has(cmd.command)) {
        suggestions.add(cmd.command);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Re-run a command from history
   */
  async rerunCommand(commandId: string): Promise<boolean> {
    const history = this.getHistory();
    const command = history.find(cmd => cmd.id === commandId);

    if (!command) {
      return false;
    }

    // Execute the command (this will be handled by the appropriate handler)
    await commands.executeCommand('dotcommand.runCommandString', command.command);
    return true;
  }

  /**
   * Export command history
   */
  exportHistory(): string {
    const history = this.getHistory();
    return JSON.stringify(history, null, 2);
  }

  /**
   * Import command history
   */
  async importHistory(jsonData: string): Promise<boolean> {
    try {
      const importedHistory = JSON.parse(jsonData) as ExecutedCommand[];

      // Validate the data
      if (!Array.isArray(importedHistory)) {
        return false;
      }

      // Merge with existing history
      const existingHistory = this.getHistory();
      const mergedHistory = [...importedHistory, ...existingHistory];

      // Remove duplicates and sort by timestamp
      const uniqueHistory = mergedHistory
        .filter((cmd, index, self) =>
          index === self.findIndex(c => c.id === cmd.id)
        )
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, CommandHistoryManager.MAX_HISTORY_SIZE);

      await this.saveHistory(uniqueHistory);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique ID for command
   */
  private generateId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save history to storage
   */
  private async saveHistory(history: ExecutedCommand[]): Promise<void> {
    await this.context.globalState.update(CommandHistoryManager.STORAGE_KEY, history);
  }
}

// Global instance
let commandHistoryManager: CommandHistoryManager | undefined;

/**
 * Initialize command history manager
 */
export function initializeCommandHistory(context: ExtensionContext, storage: CommandStorage): void {
  commandHistoryManager = new CommandHistoryManager(context, storage);
}

/**
 * Get command history manager instance
 */
export function getCommandHistoryManager(): CommandHistoryManager {
  if (!commandHistoryManager) {
    throw new Error('CommandHistoryManager not initialized');
  }
  return commandHistoryManager;
}
