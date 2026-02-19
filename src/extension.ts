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
// Import the new feature class
import { SuggestionQuickAccess } from './features/SuggestionQuickAccess';
import { initializeUpdateService, checkAndShowUpdatePanel } from './services/updateService';
import { initializeAnalyticsService, getAnalyticsService } from './services/analyticsService';
import { initializeCustomContextRules } from './utils/customContextRules';
import { initializeMLSuggestions } from './utils/mlSuggestions';
import { getPackageJsonParser } from './utils/packageJsonParser';
import { initializeLogger } from './utils/logger';
import { runAnalyticsTests } from './tests/analyticsTest'; // Make sure this path matches your file structure
import { runMLTests } from './tests/mlTest';
import { runPackageJsonTests } from './tests/packageJsonTest';

let storage: CommandStorage;
let treeDataProvider: CommandsTreeDataProvider;
let preparedTreeDataProvider: PreparedCommandsTreeDataProvider;
let treeView: TreeView<TreeItem>;
let preparedTreeView: TreeView<TreeItem>;

// Status bar items
let statusBarFavorites: StatusBarItem;
let statusBarRecent: StatusBarItem;
let statusBarQuickRun: StatusBarItem;

// Main Suggestion Feature
let suggestionQuickAccess: SuggestionQuickAccess;

export async function activate(context: ExtensionContext): Promise<void> {
  // ── Logger MUST be first — silences console in production ──────────────
  initializeLogger(context);

  console.log('Activating DotCommand v1.5.0...');

  // --- 1. Initialize Storage & Providers ---
  storage = new CommandStorage(context);
  treeDataProvider = new CommandsTreeDataProvider(storage);
  preparedTreeDataProvider = new PreparedCommandsTreeDataProvider();

  // --- 2. Initialize Core Services ---
  initializeTerminalManager(context);
  initializeCommandHistory(context, storage);
  initializeTemplateManager(context, storage);
  initializeCommandSuggestions(storage);
  initializeUpdateService(context);
  initializeCustomContextRules(context);
  initializeMLSuggestions(context);
  
  // --- 3. Initialize Analytics & Session Tracking ---
  const analytics = initializeAnalyticsService(context);
  analytics.trackSessionEvent('extension_activated');

  // --- 4. Initialize Package Intelligence ---
  const packageParser = getPackageJsonParser();
  packageParser.startWatching(context);

  // --- 5. Initialize Handlers ---
  initializeCommandHandlers(storage, treeDataProvider);
  initializeHistoryHandlers(storage, treeDataProvider);
  initializeTrashHandlers(storage, treeDataProvider);
  initializeSearchFilterHandlers(preparedTreeDataProvider, treeDataProvider, preparedTreeView, treeView);

  // --- 6. Initialize UI Views ---
  treeView = window.createTreeView('dotcommand.commandsView', {
    treeDataProvider: treeDataProvider,
  });

  preparedTreeView = window.createTreeView('dotcommand.preparedView', {
    treeDataProvider: preparedTreeDataProvider,
  });

  // --- 7. Initialize Smart Quick Access Feature ---
  suggestionQuickAccess = new SuggestionQuickAccess(context);

  // --- 8. Register Commands ---
  
  // Smart Feature Command
  context.subscriptions.push(commands.registerCommand(
    'dotcommand.quickRun', 
    () => suggestionQuickAccess.showQuickPick()
  ));

  // Developer Testing Command (Disabled by default in production)
  const config = workspace.getConfiguration('dotcommand');
  if (config.get<boolean>('testing.enabled', false)) {
      context.subscriptions.push(commands.registerCommand('dotcommand.runTests', async () => {
        
        // Double-check if testing is still enabled before running
        const config = workspace.getConfiguration('dotcommand');
        if (!config.get<boolean>('testing.enabled', false)) {
            window.showWarningMessage('Testing is currently disabled in settings. (dotcommand.testing.enabled) Please enable it and try again.');
            return;
        }

        window.showInformationMessage('🧪 Running Analytics Tests...');
          await runAnalyticsTests(context);
      }));

      // ML / LLM Tests Command
      context.subscriptions.push(commands.registerCommand('dotcommand.runMLTests', async () => {
        const cfg = workspace.getConfiguration('dotcommand');
        if (!cfg.get<boolean>('testing.enabled', false)) {
            window.showWarningMessage('Testing is currently disabled in settings. (dotcommand.testing.enabled) Please enable it and try again.');
            return;
        }
        window.showInformationMessage('🤖 Running ML Suggestions Tests...');
        await runMLTests(context);
      }));

      // PackageJson Parser Tests Command
      context.subscriptions.push(commands.registerCommand('dotcommand.runPackageJsonTests', async () => {
        const cfg = workspace.getConfiguration('dotcommand');
        if (!cfg.get<boolean>('testing.enabled', false)) {
            window.showWarningMessage('Testing is currently disabled in settings. (dotcommand.testing.enabled) Please enable it and try again.');
            return;
        }
        await runPackageJsonTests(context);
      }));
  }

  // Standard Commands
  context.subscriptions.push(commands.registerCommand('dotcommand.saveCommand', handleSaveCommand));
  context.subscriptions.push(commands.registerCommand('dotcommand.viewCommands', handleViewCommands));
  context.subscriptions.push(commands.registerCommand('dotcommand.refreshCommands', () => treeDataProvider.refresh()));
  context.subscriptions.push(commands.registerCommand('dotcommand.copyCommandFromTree', handleCopyCommandFromTree));
  context.subscriptions.push(commands.registerCommand('dotcommand.runCommandFromTree', handleRunAndTrackCommand));
  context.subscriptions.push(commands.registerCommand('dotcommand.deleteCommandFromTree', handleDeleteCommandFromTree));
  context.subscriptions.push(commands.registerCommand('dotcommand.toggleFavorite', handleToggleFavorite));
  context.subscriptions.push(commands.registerCommand('dotcommand.importTerminalHistory', handleImportTerminalHistory));
  context.subscriptions.push(commands.registerCommand('dotcommand.restoreCommandFromTrash', handleRestoreCommandFromTrash));
  context.subscriptions.push(commands.registerCommand('dotcommand.runPreparedCommand', handleRunPreparedCommand));
  context.subscriptions.push(commands.registerCommand('dotcommand.addToMyCommands', handleAddToMyCommands));
  context.subscriptions.push(commands.registerCommand('dotcommand.moveToMyCommands', handleMoveToMyCommands));
  context.subscriptions.push(commands.registerCommand('dotcommand.testCommand', handleTestCommand));
  context.subscriptions.push(commands.registerCommand('dotcommand.createNewTaskTemplate', handleCreateNewTaskTemplate));
  context.subscriptions.push(commands.registerCommand('dotcommand.taskManager', () => TaskManagerWebview.getInstance().show()));
  context.subscriptions.push(commands.registerCommand('dotcommand.viewTrash', handleViewTrash));
  context.subscriptions.push(commands.registerCommand('dotcommand.showAnalytics', handleShowAnalytics));
  context.subscriptions.push(commands.registerCommand('dotcommand.searchPreparedCommands', handleSearchPreparedCommands));
  context.subscriptions.push(commands.registerCommand('dotcommand.searchMyCommands', handleSearchMyCommands));
  context.subscriptions.push(commands.registerCommand('dotcommand.clearPreparedFilters', handleClearPreparedFilters));
  context.subscriptions.push(commands.registerCommand('dotcommand.clearMyCommandsFilters', handleClearMyCommandsFilters));
  context.subscriptions.push(commands.registerCommand('dotcommand.showCommandHistory', handleShowCommandHistory));
  context.subscriptions.push(commands.registerCommand('dotcommand.searchCommandHistory', handleSearchCommandHistory));
  context.subscriptions.push(commands.registerCommand('dotcommand.showCommandHistoryStats', handleShowCommandHistoryStats));
  context.subscriptions.push(commands.registerCommand('dotcommand.showCommandTemplates', handleShowCommandTemplates));
  context.subscriptions.push(commands.registerCommand('dotcommand.createCommandTemplate', handleCreateCommandTemplate));
  context.subscriptions.push(commands.registerCommand('dotcommand.executeCommandTemplate', handleExecuteCommandTemplate));
  context.subscriptions.push(commands.registerCommand('dotcommand.templateManager', () => TemplateManagerWebview.getInstance(context).show()));
  context.subscriptions.push(commands.registerCommand('dotcommand.quickCommandPicker', handleQuickCommandPicker));
  context.subscriptions.push(commands.registerCommand('dotcommand.showFavorites', handleShowFavorites));
  context.subscriptions.push(commands.registerCommand('dotcommand.showRecentCommands', handleShowRecentCommands));
  
  context.subscriptions.push(commands.registerCommand('dotcommand.triggerSuggestions', async () => {
      const suggestionsManager = getCommandSuggestionsManager();
      await suggestionsManager.triggerSuggestions();
  }));

  // Refresh Logic: Update tree AND update Smart Status Bar via the Class
  context.subscriptions.push(commands.registerCommand('dotcommand.refreshTree', () => {
    treeDataProvider.refreshContextAndTree();
    suggestionQuickAccess.updateStatusBar(); 
  }));

  // --- 9. Final Setups ---
  setupStatusBar(context);

  // Setup terminal monitoring
  setupTerminalMonitoring(context);

  // Register task provider
  const taskProviderDisposables = registerTaskProvider(storage);
  context.subscriptions.push(...taskProviderDisposables);

  context.subscriptions.push(treeView);
  context.subscriptions.push(preparedTreeView);

  // Check updates
  checkAndShowUpdatePanel(context);

  console.log('DotCommand extension is now active!');
}

export function deactivate(): void {
  // 1. Cleanup PackageParser
  try {
    const packageParser = getPackageJsonParser();
    packageParser.dispose();
  } catch (e) { console.error('Error disposing package parser:', e); }

  // 2. Track Deactivation Event
  try {
    const analytics = getAnalyticsService();
    analytics.trackSessionEvent('extension_deactivated');
  } catch (e) { console.error('Error tracking deactivation:', e); }
  
  console.log('DotCommand extension is now deactivated!');
}

function setupTerminalMonitoring(context: ExtensionContext): void {
  const onDidStartTerminalShellExecution = window.onDidStartTerminalShellExecution;
  if (onDidStartTerminalShellExecution) {
    context.subscriptions.push(onDidStartTerminalShellExecution((event: TerminalShellExecutionStartEvent) => {
      handleTerminalCommand(event);
    }));
  }
}

/**
 * Set up status bar items for quick command access
 * Note: Suggestions logic removed from here as it's now in SuggestionQuickAccess class
 */
function setupStatusBar(context: ExtensionContext): void {
  // Create status bar items
  statusBarQuickRun = window.createStatusBarItem(StatusBarAlignment.Left, 100);
  statusBarFavorites = window.createStatusBarItem(StatusBarAlignment.Left, 99);
  statusBarRecent = window.createStatusBarItem(StatusBarAlignment.Left, 98);

  // Configure Quick Run button
  statusBarQuickRun.text = '$(search) Quick Run';
  statusBarQuickRun.tooltip = 'Quick Command Picker';
  statusBarQuickRun.command = 'dotcommand.quickCommandPicker';
  statusBarQuickRun.show();

  // Initial Update
  updateStatusBarFavorites();
  updateStatusBarRecent();

  // Add to context subscriptions
  context.subscriptions.push(statusBarQuickRun);
  context.subscriptions.push(statusBarFavorites);
  context.subscriptions.push(statusBarRecent);

  // Update status bar when commands change
  const updateStatusBar = () => {
    updateStatusBarFavorites();
    updateStatusBarRecent();
    suggestionQuickAccess.updateStatusBar(); // Delegate to class
  };

  const treeViewDisposable = treeView.onDidChangeVisibility(updateStatusBar);
  context.subscriptions.push(treeViewDisposable);
}

function updateStatusBarFavorites(): void {
  const favoriteCommands = storage.getAllCommands().filter(cmd => cmd.isFavorite);
  if (favoriteCommands.length > 0) {
    statusBarFavorites.text = `$(star) ${favoriteCommands.length}`;
    statusBarFavorites.tooltip = `Show ${favoriteCommands.length} favorite commands`;
    statusBarFavorites.command = 'dotcommand.showFavorites';
    statusBarFavorites.show();
  } else {
    statusBarFavorites.hide();
  }
}

function updateStatusBarRecent(): void {
  import('./utils/commandHistory').then(({ getCommandHistoryManager }) => {
    const historyManager = getCommandHistoryManager();
    const recentCommands = historyManager.getRecentCommands(5);
    if (recentCommands.length > 0) {
      statusBarRecent.text = `$(history) ${recentCommands.length}`;
      statusBarRecent.tooltip = `Show ${recentCommands.length} recent commands`;
      statusBarRecent.command = 'dotcommand.showRecentCommands';
      statusBarRecent.show();
    } else {
      statusBarRecent.hide();
    }
  }).catch(console.error);
}

// ... (Keep handleTerminalCommand exactly as is)
async function handleTerminalCommand(event: TerminalShellExecutionStartEvent): Promise<void> {
    try {
        const config = workspace.getConfiguration('dotcommand');
        if (!config.get<boolean>('autoSave.enabled', true)) return;

        const commandText = typeof event.execution.commandLine === 'string'
            ? event.execution.commandLine
            : (event.execution.commandLine as { value: string }).value;
            
        if (!commandText || typeof commandText !== 'string') return;
        const commandLine = commandText.trim();
        if (!commandLine) return;

        const { cleanTerminalCommand, getActiveShellType } = await import('./commands/cleaning');
        const cleanedCommand = cleanTerminalCommand(commandLine, getActiveShellType());
        
        if (!cleanedCommand || cleanedCommand.length < config.get<number>('autoSave.minLength', 2)) return;
        if (storage.commandExists(cleanedCommand)) return;
        if (storage.getCommandCount() >= config.get<number>('general.maxCommands', 1000)) return;

        const { detectCommandCategory } = await import('./commands/detection');
        await storage.saveCommand({
            command: cleanedCommand,
            category: detectCommandCategory(cleanedCommand) || 'auto-terminal',
            source: 'auto-terminal'
        });

        if (treeDataProvider) treeDataProvider.refresh();
        
        if (config.get<boolean>('autoSave.showNotifications', false)) {
            window.showInformationMessage(`Saved: ${cleanedCommand}`, 'View').then(a => {
                if (a === 'View') commands.executeCommand('dotcommand.viewCommands');
            });
        }
    } catch (error) {
        console.error('Error auto-saving:', error);
    }
}
