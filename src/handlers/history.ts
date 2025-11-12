import { window } from 'vscode';
import { CommandStorage } from '../storage/storage';
import { CommandsTreeDataProvider } from '../providers/treeView';

let storage: CommandStorage;
let treeDataProvider: CommandsTreeDataProvider;

/**
 * Initialize history handlers with required dependencies
 */
export function initializeHistoryHandlers(commandStorage: CommandStorage, treeDataProviderInstance: CommandsTreeDataProvider) {
  storage = commandStorage;
  treeDataProvider = treeDataProviderInstance;
}

/**
 * Handle importing terminal history
 */
export async function handleImportTerminalHistory(): Promise<void> {
  try {
    const terminal = window.activeTerminal || window.terminals[0];
    if (!terminal) {
      window.showErrorMessage('No active terminal found');
      return;
    }

    // Get terminal history using shell history command
    const shell = terminal.shellIntegration;
    if (!shell) {
      window.showErrorMessage('Terminal does not support shell integration. Please enable shell integration in VS Code settings.');
      return;
    }

    // Since sendText doesn't return output, we'll try a different approach
    // Execute history command in background and show instructions
    window.showInformationMessage('To import terminal history, run "history" (or "history | cat" for some shells) and paste the output here');

    const historyText = await window.showInputBox({
      prompt: 'Paste your terminal history here (output from "history" command)',
      placeHolder: 'Paste history output...'
    });

    if (!historyText) {
      return;
    }

    // Parse history output
    const commands = parseHistoryOutput(historyText);

    if (commands.length === 0) {
      window.showInformationMessage('No valid commands found in history');
      return;
    }

    const selectedCommands = await showCommandSelectionUI(commands);

    if (selectedCommands.length > 0) {
      let savedCount = 0;
      for (const cmd of selectedCommands) {
        try {
          await storage.saveCommand({
            command: cmd,
            category: 'terminal-history'
          });
          savedCount++;
        } catch (error) {
          console.error('Error saving command:', cmd, error);
        }
      }

      treeDataProvider.refresh();
      window.showInformationMessage(`Successfully imported ${savedCount} commands from terminal history`);
    }

  } catch (error) {
    console.error('Error importing terminal history:', error);
    window.showErrorMessage(`Failed to import terminal history: ${error}`);
  }
}

/**
 * Parse history output into individual commands
 */
function parseHistoryOutput(historyText: string): string[] {
  const lines = historyText.split('\n');
  const commands: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Common history formats:
    // " 1234  ls -la"
    // "1234: ls -la"
    // "ls -la"

    let command = '';

    // Try to match numbered history entries
    const match = trimmedLine.match(/^\s*\d+:?\s*(.+)$/);
    if (match) {
      command = match[1];
    } else if (trimmedLine.length > 0) {
      // Assume it's a plain command
      command = trimmedLine;
    }

    if (command && command.length > 0) {
      // Filter out common non-interesting commands
      const skipCommands = [
        'pwd', 'ls', 'cd', 'which', 'clear', 'history',
        'echo', 'exit', 'vi', 'vim', 'nano', 'cat', 'less',
        'grep', 'find', 'chmod', 'chown', 'ps', 'top',
        'df', 'du', 'whoami', 'id', 'date', 'who'
      ];

      if (!skipCommands.some(skip => command.startsWith(skip))) {
        commands.push(command);
      }
    }
  }

  return commands;
}

/**
 * Show command selection UI for importing
 */
async function showCommandSelectionUI(commands: string[]): Promise<string[]> {
  const selectedCommands: string[] = [];

  // For large lists, offer quick import options
  if (commands.length > 10) {
    const quickAction = await window.showQuickPick([
      'Import all commands',
      'Select specific commands',
      'Import last 5 commands'
    ], {
      placeHolder: `Found ${commands.length} commands. Choose import option:`
    });

    switch (quickAction) {
      case 'Import all commands':
        return commands;
      case 'Import last 5 commands':
        return commands.slice(-5);
      case 'Select specific commands':
        // Continue to individual selection
        break;
      default:
        return []; // Cancelled
    }
  }

  // Individual command selection for smaller lists
  for (let i = commands.length - 1; i >= 0 && i >= commands.length - 10; i--) {
    const cmd = commands[i];
    const importChoice = await window.showQuickPick(
      ['Import', 'Skip', 'Stop importing'],
      {
        placeHolder: `Import command: ${cmd}?`
      }
    );

    if (importChoice === 'Stop importing' || importChoice === undefined) {
      break;
    } else if (importChoice === 'Import') {
      selectedCommands.push(cmd);
    }
  }

  return selectedCommands;
}
