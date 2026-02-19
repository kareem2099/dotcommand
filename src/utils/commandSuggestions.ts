import { window, workspace, Disposable, Terminal, QuickPickItem, QuickPick } from 'vscode';
import { CommandStorage } from '../storage/storage';
import { getCommandHistoryManager } from './commandHistory';
import { getTemplateManager } from './commandTemplates';
import { getPackageJsonParser, PackageSuggestion } from './packageJsonParser';

export interface CommandSuggestion extends QuickPickItem {
  command: string;
  source: 'history' | 'saved' | 'prepared' | 'template' | 'package';
  usageCount: number;
  lastUsed?: number;
  category?: string;
  packageSuggestion?: PackageSuggestion;
}

/**
 * Command Suggestions Manager
 * Provides intelligent command suggestions as users type in the terminal
 */
export class CommandSuggestionsManager {
  private disposables: Disposable[] = [];
  private activeTerminal: Terminal | undefined;
  private currentSuggestions: CommandSuggestion[] = [];
  private suggestionQuickPick: QuickPick<CommandSuggestion> | undefined;

  constructor(private storage: CommandStorage) {}

  /**
   * Initialize the suggestions manager
   */
  initialize(): void {
    // Listen for terminal changes
    this.disposables.push(
      window.onDidChangeActiveTerminal(terminal => {
        this.activeTerminal = terminal;
      })
    );

    // Listen for terminal input (if available)
    this.disposables.push(
      window.onDidOpenTerminal(terminal => {
        this.activeTerminal = terminal;
      })
    );

    // Set initial active terminal
    this.activeTerminal = window.activeTerminal;
  }

  /**
   * Show suggestions for the given prefix
   */
  async showSuggestions(prefix: string): Promise<void> {
    const config = workspace.getConfiguration('dotcommand');
    const suggestionsEnabled = config.get<boolean>('suggestions.enabled', true);

    if (!suggestionsEnabled) {
      return;
    }

    const minPrefixLength = config.get<number>('suggestions.minPrefixLength', 2);
    if (prefix.length < minPrefixLength) {
      this.hideSuggestions();
      return;
    }

    const suggestions = await this.getSuggestions(prefix);
    if (suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.currentSuggestions = suggestions;
    await this.showSuggestionPicker(prefix);
  }

  /**
   * Hide the current suggestions
   */
  hideSuggestions(): void {
    if (this.suggestionQuickPick) {
      this.suggestionQuickPick.hide();
      this.suggestionQuickPick = undefined;
    }
  }

  /**
   * Get suggestions for a given prefix
   */
  private async getSuggestions(prefix: string): Promise<CommandSuggestion[]> {
    const config = workspace.getConfiguration('dotcommand');
    const maxSuggestions = config.get<number>('suggestions.maxSuggestions', 5);
    const includeSaved = config.get<boolean>('suggestions.includeSavedCommands', true);
    const includePrepared = config.get<boolean>('suggestions.includePreparedCommands', false);
    const includeTemplates = config.get<boolean>('suggestions.includeTemplates', false);
    const sortByFrequency = config.get<boolean>('suggestions.sortByFrequency', true);

    const suggestions: CommandSuggestion[] = [];
    const seenCommands = new Set<string>();

    // Get history-based suggestions
    const historyManager = getCommandHistoryManager();
    const historySuggestions = historyManager.getSuggestions(prefix, maxSuggestions * 2);

    for (const cmd of historySuggestions) {
      if (!seenCommands.has(cmd)) {
        seenCommands.add(cmd);

        // Count usage frequency
        const history = historyManager.getHistory();
        const usageCount = history.filter(h => h.command === cmd).length;
        const lastUsed = history.find(h => h.command === cmd)?.timestamp;

        suggestions.push({
          label: cmd,
          description: `History (${usageCount} uses)`,
          command: cmd,
          source: 'history',
          usageCount,
          lastUsed,
          detail: lastUsed ? `Last used: ${new Date(lastUsed).toLocaleDateString()}` : undefined
        });
      }
    }

    // Add saved commands if enabled
    if (includeSaved) {
      const savedCommands = this.storage.getAllCommands()
        .filter(cmd => cmd.command.toLowerCase().startsWith(prefix.toLowerCase()))
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, maxSuggestions);

      for (const cmd of savedCommands) {
        if (!seenCommands.has(cmd.command)) {
          seenCommands.add(cmd.command);
          suggestions.push({
            label: cmd.name || cmd.command,
            description: `Saved • ${cmd.category || 'General'}`,
            detail: cmd.command,
            command: cmd.command,
            source: 'saved',
            usageCount: cmd.usageCount || 0,
            lastUsed: cmd.lastUsed,
            category: cmd.category
          });
        }
      }
    }

    // Add prepared commands if enabled
    if (includePrepared) {
      try {
        const { getPreparedCommandsForCategory, getPreparedCommandCategories } = await import('../commands/prepared');
        const categories = getPreparedCommandCategories();

        for (const category of categories) {
          const commands = getPreparedCommandsForCategory(category)
            .filter(cmd => cmd.command.toLowerCase().startsWith(prefix.toLowerCase()))
            .slice(0, Math.ceil(maxSuggestions / categories.length));

          for (const cmd of commands) {
            if (!seenCommands.has(cmd.command)) {
              seenCommands.add(cmd.command);
              suggestions.push({
                label: cmd.name,
                description: `Prepared • ${category}`,
                detail: cmd.command,
                command: cmd.command,
                source: 'prepared',
                usageCount: 0,
                category
              });
            }
          }
        }
      } catch (error) {
        console.warn('Error loading prepared commands for suggestions:', error);
      }
    }

    // Add templates if enabled
    if (includeTemplates) {
      try {
        const templateManager = getTemplateManager();
        const templates = templateManager.getAllTemplates()
          .filter(template => template.template.toLowerCase().startsWith(prefix.toLowerCase()))
          .slice(0, maxSuggestions);

        for (const template of templates) {
          if (!seenCommands.has(template.template)) {
            seenCommands.add(template.template);
            suggestions.push({
              label: template.name,
              description: `Template • ${template.category}`,
              detail: template.template,
              command: template.template,
              source: 'template',
              usageCount: template.usageCount || 0,
              lastUsed: template.lastUsed,
              category: template.category
            });
          }
        }
      } catch (error) {
        console.warn('Error loading templates for suggestions:', error);
      }
    }

    // Add package.json suggestions (npm packages from project)
    if (prefix.startsWith('npm ') || prefix.startsWith('npx ') || prefix.startsWith('yarn ') || prefix.startsWith('pnpm ')) {
      try {
        const packageParser = getPackageJsonParser();
        const packageSuggestions = await packageParser.getSuggestions(
          prefix.replace(/^(npm|npx|yarn|pnpm)\s+/, ''),
          maxSuggestions
        );

        for (const pkg of packageSuggestions) {
          // Generate command based on package type
          let command = prefix;
          if (pkg.type === 'script') {
            command = `npm run ${pkg.name}`;
          } else if (pkg.type === 'dependency') {
            command = `npm install ${pkg.name}@${pkg.version}`;
          } else if (pkg.type === 'devDependency') {
            command = `npm install -D ${pkg.name}@${pkg.version}`;
          }

          if (!seenCommands.has(command)) {
            seenCommands.add(command);
            suggestions.push({
              label: pkg.name,
              description: `Package • ${pkg.type}`,
              detail: command,
              command: command,
              source: 'package',
              usageCount: 0,
              category: 'npm',
              packageSuggestion: pkg
            });
          }
        }
      } catch (error) {
        console.warn('Error loading package suggestions:', error);
      }
    }

    // Sort suggestions
    if (sortByFrequency) {
      suggestions.sort((a, b) => {
        // Primary sort: usage count (descending)
        if (a.usageCount !== b.usageCount) {
          return b.usageCount - a.usageCount;
        }
        // Secondary sort: recency (descending)
        const aTime = a.lastUsed || 0;
        const bTime = b.lastUsed || 0;
        if (aTime !== bTime) {
          return bTime - aTime;
        }
        // Tertiary sort: alphabetical
        return a.label.localeCompare(b.label);
      });
    } else {
      // Sort by recency only
      suggestions.sort((a, b) => {
        const aTime = a.lastUsed || 0;
        const bTime = b.lastUsed || 0;
        if (aTime !== bTime) {
          return bTime - aTime;
        }
        return a.label.localeCompare(b.label);
      });
    }

    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Show the suggestion picker
   */
  private async showSuggestionPicker(prefix: string): Promise<void> {
    // Hide existing picker
    this.hideSuggestions();

    // Create new quick pick
    const quickPick = window.createQuickPick<CommandSuggestion>();
    this.suggestionQuickPick = quickPick;

    quickPick.items = this.currentSuggestions;
    quickPick.placeholder = `Suggestions for "${prefix}" (↑↓ to navigate, Enter to select, Esc to cancel)`;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    // Handle selection
    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      if (selected) {
        await this.applySuggestion(selected);
      }
      quickPick.hide();
    });

    // Handle cancellation
    quickPick.onDidHide(() => {
      this.suggestionQuickPick = undefined;
    });

    quickPick.show();
  }

  /**
   * Apply the selected suggestion to the terminal
   */
  private async applySuggestion(suggestion: CommandSuggestion): Promise<void> {
    if (!this.activeTerminal) {
      window.showErrorMessage('No active terminal found');
      return;
    }

    try {
      // Get current terminal content (this is a simplified approach)
      // In a real implementation, we'd need to hook into terminal input
      // For now, we'll just send the command directly

      // Clear current line and send the suggestion
      this.activeTerminal.sendText('\x15'); // Ctrl+U to clear line
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
      this.activeTerminal.sendText(suggestion.command);

      // Track the suggestion usage
      const historyManager = getCommandHistoryManager();
      await historyManager.trackCommand(suggestion.command, 'manual', this.activeTerminal.name);

      // Show brief confirmation
      window.showInformationMessage(`💡 Applied suggestion: ${suggestion.label}`);

    } catch (error) {
      console.error('Error applying suggestion:', error);
      window.showErrorMessage(`Failed to apply suggestion: ${error}`);
    }
  }

  /**
   * Trigger suggestions manually (for testing/debugging)
   */
  async triggerSuggestions(): Promise<void> {
    const prefix = await window.showInputBox({
      prompt: 'Enter command prefix to get suggestions',
      placeHolder: 'e.g., git, npm, docker'
    });

    if (prefix && prefix.trim()) {
      await this.showSuggestions(prefix.trim());
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.hideSuggestions();
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
  }
}

// Global instance
let commandSuggestionsManager: CommandSuggestionsManager | undefined;

/**
 * Initialize command suggestions
 */
export function initializeCommandSuggestions(storage: CommandStorage): void {
  commandSuggestionsManager = new CommandSuggestionsManager(storage);
  commandSuggestionsManager.initialize();
}

/**
 * Get command suggestions manager instance
 */
export function getCommandSuggestionsManager(): CommandSuggestionsManager {
  if (!commandSuggestionsManager) {
    throw new Error('CommandSuggestionsManager not initialized');
  }
  return commandSuggestionsManager;
}
