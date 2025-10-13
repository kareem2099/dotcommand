import { commands, ExtensionContext, window, workspace, TreeView, TerminalShellExecutionStartEvent } from 'vscode';
import { CommandStorage } from './storage';
import { CommandsTreeDataProvider } from './treeView';
import { initializeCommandHandlers } from './commandHandlers';
import { initializeHistoryHandlers } from './historyHandlers';
import { initializeTrashHandlers, handleViewTrash } from './trashHandlers';
import { handleViewCommands } from './viewHandlers';

let storage: CommandStorage;
let treeDataProvider: CommandsTreeDataProvider;
let treeView: TreeView<any>;

/**
 * Activate the extension
 */
export async function activate(context: ExtensionContext): Promise<void> {
  storage = new CommandStorage(context);
  treeDataProvider = new CommandsTreeDataProvider(storage);

  // Initialize handlers with dependencies
  initializeCommandHandlers(storage, treeDataProvider);
  initializeHistoryHandlers(storage, treeDataProvider);
  initializeTrashHandlers(storage, treeDataProvider);

  // Create the tree view
  treeView = window.createTreeView('dotcommand.commandsView', {
    treeDataProvider: treeDataProvider,
  });

  // Register commands using the already-initialized handlers
  const saveCommandDisposable = commands.registerCommand(
    'dotcommand.saveCommand',
    require('./commandHandlers').handleSaveCommand
  );

  const viewCommandsDisposable = commands.registerCommand(
    'dotcommand.viewCommands',
    handleViewCommands
  );

  const refreshCommandsDisposable = commands.registerCommand(
    'dotcommand.refreshCommands',
    () => treeDataProvider.refresh()
  );

  const copyCommandFromTreeDisposable = commands.registerCommand(
    'dotcommand.copyCommandFromTree',
    require('./commandHandlers').handleCopyCommandFromTree
  );

  const runCommandFromTreeDisposable = commands.registerCommand(
    'dotcommand.runCommandFromTree',
    require('./commandHandlers').handleRunAndTrackCommand
  );

  const deleteCommandFromTreeDisposable = commands.registerCommand(
    'dotcommand.deleteCommandFromTree',
    require('./commandHandlers').handleDeleteCommandFromTree
  );

  const toggleFavoriteCommandDisposable = commands.registerCommand(
    'dotcommand.toggleFavorite',
    require('./commandHandlers').handleToggleFavorite
  );

  const importTerminalHistoryDisposable = commands.registerCommand(
    'dotcommand.importTerminalHistory',
    require('./historyHandlers').handleImportTerminalHistory
  );

  const restoreCommandDisposable = commands.registerCommand(
    'dotcommand.restoreCommandFromTrash',
    require('./trashHandlers').handleRestoreCommandFromTrash
  );

  // Set up terminal monitoring
  setupTerminalMonitoring(context);

  // Add disposables to context subscriptions
  context.subscriptions.push(saveCommandDisposable);
  context.subscriptions.push(viewCommandsDisposable);
  context.subscriptions.push(refreshCommandsDisposable);
  context.subscriptions.push(copyCommandFromTreeDisposable);
  context.subscriptions.push(runCommandFromTreeDisposable);
  context.subscriptions.push(deleteCommandFromTreeDisposable);
  context.subscriptions.push(toggleFavoriteCommandDisposable);
  context.subscriptions.push(importTerminalHistoryDisposable);
  context.subscriptions.push(restoreCommandDisposable);
  context.subscriptions.push(treeView);

  console.log('DotCommand extension is now active!');
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  console.log('DotCommand extension is now deactivated!');
}





/**
 * Set up terminal monitoring to auto-save commands
 */
function setupTerminalMonitoring(context: ExtensionContext): void {
  // Handle terminal creation and command execution
  const onDidStartTerminalShellExecution = window.onDidStartTerminalShellExecution;

  if (onDidStartTerminalShellExecution) {
    const executionDisposable = onDidStartTerminalShellExecution((event: TerminalShellExecutionStartEvent) => {
      handleTerminalCommand(event);
    });

    context.subscriptions.push(executionDisposable);
  }
}

/**
 * Handle terminal command execution - auto-save meaningful commands
 */
async function handleTerminalCommand(event: TerminalShellExecutionStartEvent): Promise<void> {
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
    const { cleanTerminalCommand } = await import('./commandCleaning');
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

    // Auto-detect category for terminal commands, default to 'auto-terminal'
    const { detectCommandCategory } = await import('./commandDetection');
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
