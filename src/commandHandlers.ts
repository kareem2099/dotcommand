import { commands, window, workspace, TerminalShellExecutionStartEvent, env } from 'vscode';
import { CommandStorage } from './storage';
import { CommandsTreeDataProvider } from './treeView';
import { CommandInput } from './types';
import { detectCommandCategory } from './commandDetection';
import { cleanTerminalCommand } from './commandCleaning';

let storage: CommandStorage;
let treeDataProvider: CommandsTreeDataProvider;

/**
 * Initialize command handlers with required dependencies
 */
export function initializeCommandHandlers(commandStorage: CommandStorage, treeDataProviderInstance: CommandsTreeDataProvider) {
  storage = commandStorage;
  treeDataProvider = treeDataProviderInstance;
}

/**
 * Handle the save command action
 */
export async function handleSaveCommand(): Promise<void> {
  try {
    // Get the currently selected text or active editor content
    const activeEditor = window.activeTextEditor;
    let selectedText = '';

    if (activeEditor) {
      // Get selected text if any, otherwise get current line
      selectedText = activeEditor.document.getText(activeEditor.selection) ||
                     activeEditor.document.lineAt(activeEditor.selection.active.line).text.trim();
    }

    // Show input box for command
    const commandInput = await window.showInputBox({
      prompt: 'Enter the command to save',
      placeHolder: 'e.g., npm install lodash',
      value: selectedText,
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Command cannot be empty';
        }
        return null;
      }
    });

    if (!commandInput || !commandInput.trim()) {
      return; // User cancelled or entered empty command
    }

    // Show input box for optional name
    const nameInput = await window.showInputBox({
      prompt: 'Enter a name for this command (optional)',
      placeHolder: 'e.g., Install Lodash',
      value: undefined,
      validateInput: (value: string) => {
        // Name is optional, so no validation needed
        return null;
      }
    });

    // Show input box for optional category
    const categoryInput = await window.showInputBox({
      prompt: 'Enter a category for this command (optional)',
      placeHolder: 'e.g., npm, git, docker',
      value: undefined,
      validateInput: (value: string) => {
        // Category is optional, so no validation needed
        return null;
      }
    });

    // Auto-detect category based on command content
    let autoCategory = categoryInput?.trim();

    if (!autoCategory) {
      autoCategory = detectCommandCategory(commandInput.trim().toLowerCase());
    }

    // Prepare command data
    const commandData: CommandInput = {
      command: commandInput.trim(),
      name: nameInput?.trim() || undefined,
      category: autoCategory,
    };

    // Check if command already exists
    if (storage.commandExists(commandData.command)) {
      const overwrite = await window.showWarningMessage(
        'This command already exists. Do you want to save it again?',
        'Yes',
        'No'
      );

      if (overwrite !== 'Yes') {
        return;
      }
    }

    // Save the command
    const savedCommand = await storage.saveCommand(commandData);

    // Refresh the tree view to show the new command
    treeDataProvider.refresh();

    // Show success message with command name or command preview
    const displayName = savedCommand.name || savedCommand.command.substring(0, 50) + (savedCommand.command.length > 50 ? '...' : '');
    window.showInformationMessage(`Command saved: ${displayName}`);

  } catch (error) {
    console.error('Error saving command:', error);
    window.showErrorMessage(`Failed to save command: ${error}`);
  }
}

/**
 * Handle copying command from tree view
 */
export async function handleCopyCommandFromTree(item: any): Promise<void> {
  const command = treeDataProvider.getCommandById(item.id);
  if (command) {
    await env.clipboard.writeText(command.command);
    window.showInformationMessage(`Command copied: ${command.name || command.command}`);
  }
}

/**
 * Handle running command from tree view (with confirmation)
 */
export async function handleRunCommandFromTree(item: any): Promise<void> {
  const command = treeDataProvider.getCommandById(item.id);
  if (!command) return;

  // Show confirmation dialog
  const confirm = await window.showWarningMessage(
    `Run command: ${command.command}?`,
    { modal: true },
    'Yes, Run',
    'Cancel'
  );

  if (confirm === 'Yes, Run') {
    const terminal = window.activeTerminal || window.terminals[0];
    if (!terminal) {
      window.showErrorMessage('No active terminal found');
      return;
    }

    // Send command to terminal
    terminal.sendText(command.command);
    window.showInformationMessage(`Running command: ${command.name || command.command}`);
  }
}

/**
 * Handle deleting command from tree view (soft delete to trash)
 */
export async function handleDeleteCommandFromTree(item: any): Promise<void> {
  const command = treeDataProvider.getCommandById(item.id);
  if (!command) return;

  const confirm = await window.showWarningMessage(
    `Move command to trash: "${command.name || command.command}"?",
This command can be restored within 90 days.`,
    'Move to Trash',
    'Cancel'
  );

  if (confirm === 'Move to Trash') {
    // Soft delete - move to trash
    const success = await storage.updateCommand(command.id, { deletedAt: Date.now() });
    if (success) {
      treeDataProvider.refresh();
      window.showInformationMessage(
        `Command moved to trash: ${command.name || command.command}. Can be restored within 90 days.`
      );
    } else {
      window.showErrorMessage('Failed to move command to trash');
    }
  }
}

/**
 * Handle toggling favorite status
 */
export async function handleToggleFavorite(item: any): Promise<void> {
  const command = treeDataProvider.getCommandById(item.id);
  if (!command) return;

  const newFavoriteStatus = !command.isFavorite;
  await storage.updateCommand(command.id, { isFavorite: newFavoriteStatus });

  treeDataProvider.refresh();

  const statusText = newFavoriteStatus ? 'added to favorites' : 'removed from favorites';
  window.showInformationMessage(`Command ${statusText}`);
}

/**
 * Handle running command and tracking usage
 */
export async function handleRunAndTrackCommand(item: any): Promise<void> {
  const command = treeDataProvider.getCommandById(item.id);
  if (!command) return;

  // Update usage statistics
  const usageCount = (command.usageCount || 0) + 1;
  const updates: any = {
    usageCount: usageCount,
    lastUsed: Date.now()
  };

  // Check if command should be promoted to "most-used" category
  const mostUsedThreshold = workspace.getConfiguration('dotcommand').get<number>('mostUsedThreshold', 5);
  if (usageCount >= mostUsedThreshold && command.category !== 'most-used') {
    updates.category = 'most-used';
    window.showInformationMessage(`🔥 Command promoted to "Most Used" category`);
  }

  await storage.updateCommand(command.id, updates);

  // Refresh tree view if category was changed
  if (updates.category) {
    treeDataProvider.refresh();
  }

  // Run the command using existing logic
  await handleRunCommandFromTree(item);
}

/**
 * Handle terminal command execution - auto-save meaningful commands
 */
export async function handleTerminalCommand(event: TerminalShellExecutionStartEvent): Promise<void> {
  try {
    console.log('Terminal command execution detected');

    // Check if auto-save is enabled in configuration
    const config = workspace.getConfiguration('dotcommand');
    const autoSaveEnabled = config.get<boolean>('autoSave.enabled', true);

    if (!autoSaveEnabled) {
      console.log('Auto-save is disabled');
      return; // Auto-save is disabled
    }

    const commandLineValue = event.execution.commandLine;

    // Handle both string and object commandLine formats
    let commandText: string = '';

    if (typeof commandLineValue === 'string') {
      commandText = commandLineValue;
    } else if (commandLineValue && typeof commandLineValue === 'object') {
      // Handle object format with value property
      commandText = (commandLineValue as any).value || '';
    }

    console.log('Raw command line:', commandText);

    // Ensure we have a valid string command
    if (!commandText || typeof commandText !== 'string') {
      console.log('Invalid command text format');
      return;
    }

    const commandLine = commandText.trim();

    // Skip if command is empty or just whitespace
    if (!commandLine) {
      return;
    }

    // Extract the actual command (remove shell prompt and arguments)
    const cleanedCommand = cleanTerminalCommand(commandLine);
    console.log('Cleaned command:', cleanedCommand);

    // Get minimum length from configuration
    const minLength = config.get<number>('autoSave.minLength', 2);
    console.log('Minimum length required:', minLength, 'Current length:', cleanedCommand?.length);

    // Skip if cleaned command is empty or too short (likely not a complete command)
    if (!cleanedCommand || cleanedCommand.length < minLength) {
      console.log('Command too short or empty, skipping');
      return;
    }

    // Check if this command already exists in storage
    if (storage.commandExists(cleanedCommand)) {
      return; // Already saved
    }

    // Check maximum commands limit
    const maxCommands = config.get<number>('general.maxCommands', 1000);
    if (storage.getCommandCount() >= maxCommands) {
      console.log('Maximum command limit reached, not auto-saving');
      return;
    }

    // Auto-detect category for terminal commands
    let detectedCategory = detectCommandCategory(cleanedCommand);
    if (!detectedCategory) {
      detectedCategory = 'auto-terminal';
    }

    // Auto-save the command
    try {
      console.log('Attempting to save command:', cleanedCommand, 'Category:', detectedCategory);
      const savedCommand = await storage.saveCommand({
        command: cleanedCommand,
        category: detectedCategory,
        source: 'auto-terminal'
      });

      // Refresh tree view to show new command
      if (treeDataProvider) {
        treeDataProvider.refresh();
      }

      console.log(`Successfully auto-saved terminal command: ${cleanedCommand}`);

      // Show notification if enabled in configuration
      const showNotifications = config.get<boolean>('autoSave.showNotifications', false);
      if (showNotifications) {
        window.showInformationMessage(
          `Command auto-saved: ${cleanedCommand.substring(0, 30)}${cleanedCommand.length > 30 ? '...' : ''}`,
          'View'
        ).then(action => {
          if (action === 'View') {
            commands.executeCommand('dotcommand.viewCommands');
          }
        });
      } else {
        console.log('Notifications disabled, command saved silently');
      }

    } catch (saveError) {
      console.error('Error auto-saving terminal command:', saveError);
    }

  } catch (error) {
    console.error('Error handling terminal command:', error);
  }
}
