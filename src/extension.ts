import { commands, ExtensionContext, window, workspace, TreeView, TerminalShellExecutionStartEvent, TreeDataProvider, TreeItem, TreeItemCollapsibleState, ThemeIcon } from 'vscode';
import { CommandStorage } from './storage';
import { CommandsTreeDataProvider } from './treeView';
import { initializeCommandHandlers } from './commandHandlers';
import { initializeHistoryHandlers } from './historyHandlers';
import { initializeTrashHandlers, handleViewTrash } from './trashHandlers';
import { handleViewCommands } from './viewHandlers';
import { handleRunPreparedCommand } from './commandHandlers';
import { registerTaskProvider } from './taskProvider';
import { getPreparedCommandCategories, getPreparedCommandsForCategory } from './preparedCommands';
import { TaskManagerWebview } from './taskManagerWebview';

/**
 * Tree data provider for prepared (built-in) commands
 */
class PreparedCommandsTreeDataProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: any;

  constructor() {}

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Promise<TreeItem[]> {
    return this.getPreparedViewChildren(element);
  }

  private async getPreparedViewChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Root level - show prepared command categories
      const items: TreeItem[] = [];

      // Get all categories from the PREPARED_COMMANDS
      const categories = getPreparedCommandCategories();

      // Create items for each category
      categories.forEach(category => {
        const categoryItem = this.createCategoryTreeItem(category);
        items.push(categoryItem);
      });

      // My Prepared Tasks from tasks.dotcommand - always show at the end
      const { readTasksDotCommand } = require('./taskProvider');
      const userTasks = await readTasksDotCommand();
      if (userTasks.length > 0) {
        const tasksItem = new TreeItem('📋 My Prepared Tasks', TreeItemCollapsibleState.Collapsed);
        tasksItem.iconPath = new ThemeIcon('tools');
        tasksItem.contextValue = 'preparedCategory';
        tasksItem.tooltip = 'Custom prepared tasks from tasks.dotcommand file';
        items.push(tasksItem);
      }

      return items;
    }

    // Handle expansion of prepared categories
    if (element.contextValue === 'preparedCategory') {
      const label = typeof element.label === 'string' ? element.label : element.label?.label;
      // Extract category name from label (format: "emoji Category Name")
      const categoryName = label?.split(' ').slice(1).join(' ').trim();

      if (categoryName === 'My Prepared Tasks') {
        return this.getMyPreparedTasks();
      } else {
        // Handle dynamic categories from PREPARED_COMMANDS
        return this.getDynamicCategoryCommands(categoryName || '');
      }
    }

    return [];
  }

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

  private getPreparedDockerCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Build Image', 'docker build -t myapp .', 'Build Docker image from Dockerfile'),
      this.createPreparedCommandItem('Run Container', 'docker run -p 3000:3000 myapp', 'Run Docker container'),
      this.createPreparedCommandItem('List Images', 'docker images', 'List all Docker images'),
      this.createPreparedCommandItem('List Containers', 'docker ps -a', 'List all containers'),
      this.createPreparedCommandItem('Docker Compose Up', 'docker-compose up -d', 'Start services with compose'),
      this.createPreparedCommandItem('View Logs', 'docker logs container-name', 'View container logs'),
      this.createPreparedCommandItem('Execute Shell', 'docker exec -it container-name sh', 'Execute shell in running container'),
      this.createPreparedCommandItem('Stop Container', 'docker stop container-name', 'Stop running container')
    ];
  }

  private getPreparedK8sCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Get Pods', 'kubectl get pods', 'List all pods in cluster'),
      this.createPreparedCommandItem('Get Services', 'kubectl get services', 'List all services'),
      this.createPreparedCommandItem('Get Logs', 'kubectl logs pod-name', 'View logs from pod'),
      this.createPreparedCommandItem('Apply Manifest', 'kubectl apply -f file.yml', 'Apply Kubernetes manifest'),
      this.createPreparedCommandItem('Delete Pod', 'kubectl delete pod pod-name', 'Delete specific pod'),
      this.createPreparedCommandItem('View Events', 'kubectl get events', 'Show cluster events'),
      this.createPreparedCommandItem('Check Status', 'kubectl cluster-info', 'Get cluster information'),
      this.createPreparedCommandItem('Scale Deployment', 'kubectl scale deployment app-name --replicas=3', 'Scale deployment replicas')
    ];
  }

  private getPreparedLinuxCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Current Directory', 'pwd', 'Print working directory path'),
      this.createPreparedCommandItem('List Files', 'ls -la', 'List files with detailed information'),
      this.createPreparedCommandItem('Change Directory', 'cd {directory}', 'Navigate to a folder'),
      this.createPreparedCommandItem('Create Directory', 'mkdir {directory}', 'Create a new directory'),
      this.createPreparedCommandItem('Remove Directory', 'rm -rf {directory}', 'Remove directory and contents'),
      this.createPreparedCommandItem('Copy File', 'cp {source} {destination}', 'Copy files or directories'),
      this.createPreparedCommandItem('Move File', 'mv {source} {destination}', 'Move or rename files'),
      this.createPreparedCommandItem('View File', 'cat {file}', 'Display file contents'),
      this.createPreparedCommandItem('Find Files', 'find {directory} -name "{pattern}"', 'Search for files by name'),
      this.createPreparedCommandItem('Search Text', 'grep "{search}" {file}', 'Search for text in files')
    ];
  }

  private async getMyPreparedTasks(): Promise<TreeItem[]> {
    const { readTasksDotCommand } = require('./taskProvider');
    const userTasks = await readTasksDotCommand();

    return userTasks.map((task: any) => {
      const item = new TreeItem(task.label);
      item.description = task.command;
      item.tooltip = `${task.description || 'Custom prepared task'}\n\nRight-click: Run this task or Move to My Commands`;
      item.iconPath = new ThemeIcon('tools');
      item.contextValue = 'userPreparedTaskItem'; // Changed to differentiate from built-in prepared commands
      item.id = `user_prepared_task_${task.command.replace(/[^a-zA-Z0-9]/g, '_')}`;

      item.command = {
        command: 'dotcommand.runPreparedCommand',
        arguments: [task.command], // Pass the command template that will be looked up
        title: 'Run Prepared Task'
      };
      return item;
    });
  }

  private async getNpmTasks(): Promise<TreeItem[]> {
    const { readTasksDotCommand } = require('./taskProvider');
    const npmTasks = await readTasksDotCommand();

    return npmTasks.map((task: any) => {
      const item = new TreeItem(task.label);
      item.description = task.command;
      item.tooltip = `${task.description || 'NPM task from tasks.dotcommand'}\n\nRight-click: Run this task or Move to My Commands`;
      item.iconPath = new ThemeIcon('package');
      item.contextValue = 'userPreparedTaskItem'; // Changed to allow moving to My Commands
      item.id = `npm_task_${task.command.replace(/[^a-zA-Z0-9]/g, '_')}`;

      item.command = {
        command: 'dotcommand.runPreparedCommand',
        arguments: [task.command],
        title: 'Run NPM Task'
      };
      return item;
    });
  }

  /**
   * Create a category tree item with appropriate icon and tooltip
   */
  private createCategoryTreeItem(categoryName: string): TreeItem {
    const { icon, tooltip } = this.getCategoryDisplayInfo(categoryName);
    const item = new TreeItem(icon + ' ' + categoryName, TreeItemCollapsibleState.Collapsed);
    item.iconPath = this.getCategoryIcon(categoryName);
    item.contextValue = 'preparedCategory';
    item.tooltip = tooltip;
    return item;
  }

  /**
   * Get display information for a category
   */
  private getCategoryDisplayInfo(categoryName: string): { icon: string; tooltip: string } {
    const categoryMap: { [key: string]: { icon: string; tooltip: string } } = {
      'Git Commands': {
        icon: '🚀',
        tooltip: 'Essential Git commands for version control'
      },
      'Git Commands Advanced': {
        icon: '🌟',
        tooltip: 'Advanced Git commands for power users'
      },
      'NPM Commands': {
        icon: '📦',
        tooltip: 'Common NPM package management commands'
      },
      'Yarn Commands': {
        icon: '🧶',
        tooltip: 'Yarn package manager commands'
      },
      'Python Commands': {
        icon: '🐍',
        tooltip: 'Python development and management commands'
      },
      'Database Commands': {
        icon: '🗃️',
        tooltip: 'Database connection and management commands'
      },
      'Docker Commands': {
        icon: '🐳',
        tooltip: 'Docker container management commands'
      },
      'Kubernetes Commands': {
        icon: '☸️',
        tooltip: 'Kubernetes cluster management commands'
      },
      'Linux Commands': {
        icon: '🐧',
        tooltip: 'Essential Linux system commands'
      },
      'Code Quality Commands': {
        icon: '✨',
        tooltip: 'Code linting and formatting tools'
      },
      'Testing Commands': {
        icon: '🧪',
        tooltip: 'Testing frameworks and utilities'
      },
      'Deployment Commands': {
        icon: '🚀',
        tooltip: 'Application deployment commands'
      }
    };

    return categoryMap[categoryName] || {
      icon: '📁',
      tooltip: `Commands for ${categoryName.toLowerCase()}`
    };
  }

  /**
   * Get VS Code ThemeIcon for a category
   */
  private getCategoryIcon(categoryName: string): ThemeIcon {
    const iconMap: { [key: string]: ThemeIcon } = {
      'Git Commands': new ThemeIcon('git-branch'),
      'Git Commands Advanced': new ThemeIcon('git-commit'),
      'NPM Commands': new ThemeIcon('package'),
      'Yarn Commands': new ThemeIcon('extensions'),
      'Python Commands': new ThemeIcon('snake'),
      'Database Commands': new ThemeIcon('database'),
      'Docker Commands': new ThemeIcon('vm'),
      'Kubernetes Commands': new ThemeIcon('server-process'),
      'Linux Commands': new ThemeIcon('terminal'),
      'Code Quality Commands': new ThemeIcon('checklist'),
      'Testing Commands': new ThemeIcon('beaker'),
      'Deployment Commands': new ThemeIcon('cloud-upload')
    };

    return iconMap[categoryName] || new ThemeIcon('folder');
  }

  /**
   * Get commands for any dynamic category from PREPARED_COMMANDS
   */
  private getDynamicCategoryCommands(categoryName: string): TreeItem[] {
    const commands = getPreparedCommandsForCategory(categoryName);

    return commands.map(cmd => {
      const item = new TreeItem(cmd.name);
      item.description = cmd.command;
      item.tooltip = `${cmd.description}\n\nRight-click: Run this prepared command`;
      item.iconPath = new ThemeIcon('star');
      item.contextValue = 'preparedCommandItem';
      item.id = `prepared_${cmd.name.replace(/[^a-zA-Z0-9]/g, '_')}_${cmd.command.replace(/[^a-zA-Z0-9]/g, '_')}`;

      item.command = {
        command: 'dotcommand.runPreparedCommand',
        arguments: [cmd.command], // Pass the command template that will be looked up
        title: 'Run Prepared Command'
      };
      return item;
    });
  }

  private createPreparedCommandItem(name: string, command: string, description: string): TreeItem {
    const item = new TreeItem(name);
    item.description = command;
    item.tooltip = `${description}\n\nRight-click: Run this prepared command`;
    item.iconPath = new ThemeIcon('star');
    item.contextValue = 'preparedCommandItem';
    item.id = `prepared_${command.replace(/[^a-zA-Z0-9]/g, '_')}`;

    item.command = {
      command: 'dotcommand.runPreparedCommand',
      arguments: [command], // Pass the command template that will be looked up
      title: 'Run Prepared Command'
    };
    return item;
  }
}

let storage: CommandStorage;
let treeDataProvider: CommandsTreeDataProvider;
let preparedTreeDataProvider: PreparedCommandsTreeDataProvider;
let treeView: TreeView<any>;
let preparedTreeView: TreeView<any>;

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

  const runPreparedCommandDisposable = commands.registerCommand(
    'dotcommand.runPreparedCommand',
    require('./commandHandlers').handleRunPreparedCommand
  );

  const addToMyCommandsDisposable = commands.registerCommand(
    'dotcommand.addToMyCommands',
    require('./commandHandlers').handleAddToMyCommands
  );

  const moveToMyCommandsDisposable = commands.registerCommand(
    'dotcommand.moveToMyCommands',
    require('./commandHandlers').handleMoveToMyCommands
  );

  const testCommandDisposable = commands.registerCommand(
    'dotcommand.testCommand',
    require('./commandHandlers').handleTestCommand
  );

  const createNewTaskTemplateDisposable = commands.registerCommand(
    'dotcommand.createNewTaskTemplate',
    require('./commandHandlers').handleCreateNewTaskTemplate
  );

  const taskManagerDisposable = commands.registerCommand(
    'dotcommand.taskManager',
    () => TaskManagerWebview.getInstance().show()
  );

  const viewTrashDisposable = commands.registerCommand(
    'dotcommand.viewTrash',
    require('./trashHandlers').handleViewTrash
  );

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
