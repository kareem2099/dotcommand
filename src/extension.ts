import { commands, ExtensionContext, window, workspace, TreeView, TreeItem, TerminalShellExecutionStartEvent, StatusBarItem, StatusBarAlignment } from 'vscode';
import { CommandStorage } from './storage/storage';
import { CommandsTreeDataProvider } from './providers/treeView';
import { initializeCommandHandlers, handleSaveCommand, handleCopyCommandFromTree, handleRunAndTrackCommand, handleDeleteCommandFromTree, handleToggleFavorite, handleRunPreparedCommand, handleAddToMyCommands, handleMoveToMyCommands, handleTestCommand, handleCreateNewTaskTemplate, handleShowAnalytics, handleShowCommandHistory, handleSearchCommandHistory, handleShowCommandHistoryStats, handleShowCommandTemplates, handleCreateCommandTemplate, handleExecuteCommandTemplate, handleQuickCommandPicker, handleShowFavorites, handleShowRecentCommands } from './commands/handlers';
import { initializeHistoryHandlers, handleImportTerminalHistory } from './handlers/history';
import { initializeTrashHandlers, handleViewTrash, handleRestoreCommandFromTrash } from './handlers/trash';
import { initializeSearchFilterHandlers, handleSearchPreparedCommands, handleSearchMyCommands, handleClearPreparedFilters, handleClearMyCommandsFilters } from './handlers/searchFilter';
import { handleViewCommands } from './handlers/view';
import { registerTaskProvider } from './providers/taskProvider';
import { TaskManagerWebview } from './webviews/taskManager';
import { TemplateManagerWebview } from './webviews/templateManager';
import { PreparedCommandsTreeDataProvider } from './providers/preparedCommandsTreeDataProvider';
import { initializeTerminalManager } from './utils/terminalManager';
import { initializeCommandHistory } from './utils/commandHistory';
import { initializeTemplateManager } from './utils/commandTemplates';
import { initializeCommandSuggestions, getCommandSuggestionsManager } from './utils/commandSuggestions';



let storage: CommandStorage;
let treeDataProvider: CommandsTreeDataProvider;
let preparedTreeDataProvider: PreparedCommandsTreeDataProvider;
let treeView: TreeView<TreeItem>;
let preparedTreeView: TreeView<TreeItem>;

// Status bar items for quick access
let statusBarFavorites: StatusBarItem;
let statusBarRecent: StatusBarItem;
let statusBarQuickRun: StatusBarItem;

/**
 * Activate the extension
 */
export async function activate(context: ExtensionContext): Promise<void> {
  storage = new CommandStorage(context);
  treeDataProvider = new CommandsTreeDataProvider(storage);

  // Create prepared commands tree data provider
  preparedTreeDataProvider = new PreparedCommandsTreeDataProvider();

  // Initialize handlers with dependencies
  initializeCommandHandlers(storage, treeDataProvider);
  initializeHistoryHandlers(storage, treeDataProvider);
  initializeTrashHandlers(storage, treeDataProvider);
  initializeSearchFilterHandlers(preparedTreeDataProvider, treeDataProvider, preparedTreeView, treeView);
  // Initialize terminal manager
  initializeTerminalManager(context);
  // Initialize command history
  initializeCommandHistory(context, storage);
  // Initialize template manager
  initializeTemplateManager(context, storage);
  // Initialize command suggestions
  initializeCommandSuggestions(storage);
  // Note: Prepared commands don't need separate initialization - they're handled in PreparedCommandsTreeDataProvider

  // Create the main commands tree view
  treeView = window.createTreeView('dotcommand.commandsView', {
    treeDataProvider: treeDataProvider,
  });

  // Create the prepared commands tree view
  preparedTreeView = window.createTreeView('dotcommand.preparedView', {
    treeDataProvider: preparedTreeDataProvider,
  });

  // Register commands using the already-initialized handlers
  const saveCommandDisposable = commands.registerCommand(
    'dotcommand.saveCommand',
    handleSaveCommand
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
    handleCopyCommandFromTree
  );

  const runCommandFromTreeDisposable = commands.registerCommand(
    'dotcommand.runCommandFromTree',
    handleRunAndTrackCommand
  );

  const deleteCommandFromTreeDisposable = commands.registerCommand(
    'dotcommand.deleteCommandFromTree',
    handleDeleteCommandFromTree
  );

  const toggleFavoriteCommandDisposable = commands.registerCommand(
    'dotcommand.toggleFavorite',
    handleToggleFavorite
  );

  const importTerminalHistoryDisposable = commands.registerCommand(
    'dotcommand.importTerminalHistory',
    handleImportTerminalHistory
  );

  const restoreCommandDisposable = commands.registerCommand(
    'dotcommand.restoreCommandFromTrash',
    handleRestoreCommandFromTrash
  );

  const runPreparedCommandDisposable = commands.registerCommand(
    'dotcommand.runPreparedCommand',
    handleRunPreparedCommand
  );

  const addToMyCommandsDisposable = commands.registerCommand(
    'dotcommand.addToMyCommands',
    handleAddToMyCommands
  );

  const moveToMyCommandsDisposable = commands.registerCommand(
    'dotcommand.moveToMyCommands',
    handleMoveToMyCommands
  );

  const testCommandDisposable = commands.registerCommand(
    'dotcommand.testCommand',
    handleTestCommand
  );

  const createNewTaskTemplateDisposable = commands.registerCommand(
    'dotcommand.createNewTaskTemplate',
    handleCreateNewTaskTemplate
  );

  const taskManagerDisposable = commands.registerCommand(
    'dotcommand.taskManager',
    () => TaskManagerWebview.getInstance().show()
  );

  const viewTrashDisposable = commands.registerCommand(
    'dotcommand.viewTrash',
    handleViewTrash
  );

  const showAnalyticsDisposable = commands.registerCommand(
    'dotcommand.showAnalytics',
    handleShowAnalytics
  );

  const searchPreparedCommandsDisposable = commands.registerCommand(
    'dotcommand.searchPreparedCommands',
    handleSearchPreparedCommands
  );

  const searchMyCommandsDisposable = commands.registerCommand(
    'dotcommand.searchMyCommands',
    handleSearchMyCommands
  );

  const clearPreparedFiltersDisposable = commands.registerCommand(
    'dotcommand.clearPreparedFilters',
    handleClearPreparedFilters
  );

  const clearMyCommandsFiltersDisposable = commands.registerCommand(
    'dotcommand.clearMyCommandsFilters',
    handleClearMyCommandsFilters
  );

  const showCommandHistoryDisposable = commands.registerCommand(
    'dotcommand.showCommandHistory',
    handleShowCommandHistory
  );

  const searchCommandHistoryDisposable = commands.registerCommand(
    'dotcommand.searchCommandHistory',
    handleSearchCommandHistory
  );

  const showCommandHistoryStatsDisposable = commands.registerCommand(
    'dotcommand.showCommandHistoryStats',
    handleShowCommandHistoryStats
  );

  const showCommandTemplatesDisposable = commands.registerCommand(
    'dotcommand.showCommandTemplates',
    handleShowCommandTemplates
  );

  const createCommandTemplateDisposable = commands.registerCommand(
    'dotcommand.createCommandTemplate',
    handleCreateCommandTemplate
  );

  const executeCommandTemplateDisposable = commands.registerCommand(
    'dotcommand.executeCommandTemplate',
    handleExecuteCommandTemplate
  );

  const templateManagerDisposable = commands.registerCommand(
    'dotcommand.templateManager',
    () => TemplateManagerWebview.getInstance(context).show()
  );

  const quickCommandPickerDisposable = commands.registerCommand(
    'dotcommand.quickCommandPicker',
    handleQuickCommandPicker
  );

  const showFavoritesDisposable = commands.registerCommand(
    'dotcommand.showFavorites',
    handleShowFavorites
  );

  const showRecentCommandsDisposable = commands.registerCommand(
    'dotcommand.showRecentCommands',
    handleShowRecentCommands
  );

  const triggerSuggestionsDisposable = commands.registerCommand(
    'dotcommand.triggerSuggestions',
    async () => {
      const suggestionsManager = getCommandSuggestionsManager();
      await suggestionsManager.triggerSuggestions();
    }
  );

  // Set up status bar items for quick access
  setupStatusBar(context);

  // Set up terminal monitoring
  setupTerminalMonitoring(context);

  // Register task provider for VS Code tasks integration
  const taskProviderDisposables = registerTaskProvider(storage);

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
  context.subscriptions.push(runPreparedCommandDisposable);
  context.subscriptions.push(addToMyCommandsDisposable);
  context.subscriptions.push(moveToMyCommandsDisposable);
  context.subscriptions.push(testCommandDisposable);
  context.subscriptions.push(createNewTaskTemplateDisposable);
  context.subscriptions.push(taskManagerDisposable);
  context.subscriptions.push(viewTrashDisposable);
  context.subscriptions.push(showAnalyticsDisposable);
  context.subscriptions.push(searchPreparedCommandsDisposable);
  context.subscriptions.push(searchMyCommandsDisposable);
  context.subscriptions.push(clearPreparedFiltersDisposable);
  context.subscriptions.push(clearMyCommandsFiltersDisposable);
  context.subscriptions.push(showCommandHistoryDisposable);
  context.subscriptions.push(searchCommandHistoryDisposable);
  context.subscriptions.push(showCommandHistoryStatsDisposable);
  context.subscriptions.push(showCommandTemplatesDisposable);
  context.subscriptions.push(createCommandTemplateDisposable);
  context.subscriptions.push(executeCommandTemplateDisposable);
  context.subscriptions.push(templateManagerDisposable);
  context.subscriptions.push(quickCommandPickerDisposable);
  context.subscriptions.push(showFavoritesDisposable);
  context.subscriptions.push(showRecentCommandsDisposable);
  context.subscriptions.push(triggerSuggestionsDisposable);
  context.subscriptions.push(treeView);
  context.subscriptions.push(preparedTreeView);

  // Add task provider disposables
  context.subscriptions.push(...taskProviderDisposables);

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
 * Set up status bar items for quick command access
 */
function setupStatusBar(context: ExtensionContext): void {
  // Create status bar items
  statusBarQuickRun = window.createStatusBarItem(StatusBarAlignment.Left, 100);
  statusBarFavorites = window.createStatusBarItem(StatusBarAlignment.Left, 99);
  statusBarRecent = window.createStatusBarItem(StatusBarAlignment.Left, 98);

  // Configure Quick Run button
  statusBarQuickRun.text = '$(search) Quick Run';
  statusBarQuickRun.tooltip = 'Quick Command Picker - Search and execute commands instantly';
  statusBarQuickRun.command = 'dotcommand.quickCommandPicker';
  statusBarQuickRun.show();

  // Configure Favorites button
  updateStatusBarFavorites();

  // Configure Recent button
  updateStatusBarRecent();

  // Add to context subscriptions
  context.subscriptions.push(statusBarQuickRun);
  context.subscriptions.push(statusBarFavorites);
  context.subscriptions.push(statusBarRecent);

  // Update status bar when commands change
  const updateStatusBar = () => {
    updateStatusBarFavorites();
    updateStatusBarRecent();
  };

  // Listen for command changes (refresh tree view triggers this)
  const treeViewDisposable = treeView.onDidChangeVisibility(updateStatusBar);
  context.subscriptions.push(treeViewDisposable);
}

/**
 * Update the favorites status bar item
 */
function updateStatusBarFavorites(): void {
  const favoriteCommands = storage.getAllCommands().filter(cmd => cmd.isFavorite);

  if (favoriteCommands.length > 0) {
    statusBarFavorites.text = `$(star) ${favoriteCommands.length}`;
    statusBarFavorites.tooltip = `Show ${favoriteCommands.length} favorite commands`;
    statusBarFavorites.command = {
      command: 'dotcommand.showFavorites',
      title: 'Show Favorite Commands',
      arguments: []
    };
    statusBarFavorites.show();
  } else {
    statusBarFavorites.hide();
  }
}

/**
 * Update the recent commands status bar item
 */
function updateStatusBarRecent(): void {
  // Import dynamically to avoid circular dependencies
  import('./utils/commandHistory').then(({ getCommandHistoryManager }) => {
    const historyManager = getCommandHistoryManager();
    const recentCommands = historyManager.getRecentCommands(5);

    if (recentCommands.length > 0) {
      statusBarRecent.text = `$(history) ${recentCommands.length}`;
      statusBarRecent.tooltip = `Show ${recentCommands.length} recent commands`;
      statusBarRecent.command = {
        command: 'dotcommand.showRecentCommands',
        title: 'Show Recent Commands',
        arguments: []
      };
      statusBarRecent.show();
    } else {
      statusBarRecent.hide();
    }
  }).catch(error => {
    console.error('Error updating status bar recent:', error);
  });
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
      commandText = (commandLineValue as { value: string }).value || '';
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
    const { cleanTerminalCommand, getActiveShellType } = await import('./commands/cleaning');
    const shellType = getActiveShellType();
    const cleanedCommand = cleanTerminalCommand(commandLine, shellType);
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
    const { detectCommandCategory } = await import('./commands/detection');
    let detectedCategory = detectCommandCategory(cleanedCommand);
    if (!detectedCategory) {
      detectedCategory = 'auto-terminal';
    }

    // Auto-save the command
    try {
      console.log('Attempting to save command:', cleanedCommand, 'Category:', detectedCategory);
      await storage.saveCommand({
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
