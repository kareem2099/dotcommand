import { commands, window, workspace, TerminalShellExecutionStartEvent, env, TreeItem } from 'vscode';
import { CommandStorage } from '../storage/storage';
import { CommandsTreeDataProvider } from '../providers/treeView';
import { handlePreparedCommand, PreparedCommand } from '../commands/prepared';
import { CommandInput } from '../utils/types';
import { detectCommandCategory } from '../commands/detection';
import { cleanTerminalCommand } from '../commands/cleaning';
import { CommandValidator } from '../commands/validator';
import { CommandTestWebview } from '../webviews/test';
import { DotCommandTask } from '../providers/taskProvider';
import { getTerminalManager } from '../utils/terminalManager';
import { getCommandHistoryManager } from '../utils/commandHistory';
import { getTemplateManager, CommandTemplate, TemplateVariable } from '../utils/commandTemplates';

// Type definitions for better type safety
interface WebviewMessage {
  type: 'save' | 'edit' | 'cancel';
}

interface TaskTemplate {
  version: string;
  preparedTasks: PreparedTask[];
}

interface PreparedTask {
  label: string;
  command: string;
  description: string;
  category: string;
}

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

    // Offer to test the command first
    const actionChoice = await window.showQuickPick(
      [
        {
          label: 'Save Directly',
          detail: 'Skip validation and save the command immediately',
          value: 'save'
        },
        {
          label: 'Test Command First',
          detail: 'Run validation and preview before saving',
          value: 'test'
        }
      ],
      {
        placeHolder: 'How would you like to proceed?',
        matchOnDetail: true
      }
    );

    if (!actionChoice) {
      return; // User cancelled
    }

    if (actionChoice.value === 'test') {
      // Use the test command handler with the already collected command
      const validationResult = await CommandValidator.validateCommand(commandInput.trim());

      // Show test results in webview
      const testWebview = CommandTestWebview.getInstance();

      // Set up message handler for webview actions
      testWebview.setMessageHandler(async (message: WebviewMessage) => {
        switch (message.type) {
          case 'save':
            // Proceed to save the command
            testWebview.dispose(); // Close the webview
            await proceedWithSave(commandInput.trim());
            break;
          case 'edit':
            // Close webview and restart save process
            testWebview.dispose();
            // Recursively call handleSaveCommand to restart the flow
            await handleSaveCommand();
            break;
          case 'cancel':
            // Just close the webview
            testWebview.dispose();
            break;
        }
      });

      // Show the validation results
      await testWebview.showTestResults(commandInput.trim(), validationResult);
      return; // Exit here - webview handles the rest
    }

    // Direct save path continues below
    await proceedWithSave(commandInput.trim());

  } catch (error) {
    console.error('Error saving command:', error);
    window.showErrorMessage(`Failed to save command: ${error}`);
  }
}

/**
 * Handle copying command from tree view
 */
export async function handleCopyCommandFromTree(item: TreeItem): Promise<void> {
  if (!item.id) return;
  const command = treeDataProvider.getCommandById(item.id);
  if (command) {
    await env.clipboard.writeText(command.command);
    window.showInformationMessage(`Command copied: ${command.name || command.command}`);
  }
}

/**
 * Handle running command from tree view (with confirmation)
 */
export async function handleRunCommandFromTree(item: TreeItem): Promise<void> {
  if (!item.id) return;
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
    // Get terminal for this command using TerminalManager
    const terminalManager = getTerminalManager();
    const terminal = terminalManager.getOrCreateTerminal(command.command, storage.getContext());

    // Track command execution
    const terminalName = terminal.name;
    terminalManager.trackCommand(terminalName, command.command);

    // Track in global command history
    const historyManager = getCommandHistoryManager();
    await historyManager.trackCommand(command.command, 'saved', terminalName, command.category);

    // Ensure terminal panel is visible and focus the terminal
    await commands.executeCommand('workbench.action.terminal.focus');
    terminal.show(true); // true parameter focuses the terminal

    // Wait for terminal to be ready, then send command
    setTimeout(() => {
      terminal.sendText(command.command);
      window.showInformationMessage(`Running command: ${command.name || command.command}`);
    }, 500); // Wait 500ms for terminal to fully open
  }
}

/**
 * Handle deleting command from tree view (soft delete to trash)
 */
export async function handleDeleteCommandFromTree(item: TreeItem): Promise<void> {
  if (!item.id) return;
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
export async function handleToggleFavorite(item: TreeItem): Promise<void> {
  if (!item.id) return;
  const command = treeDataProvider.getCommandById(item.id);
  if (!command) return;

  const newFavoriteStatus = !command.isFavorite;
  await storage.updateCommand(command.id, { isFavorite: newFavoriteStatus });

  treeDataProvider.refresh();

  const statusText = newFavoriteStatus ? 'added to favorites' : 'removed from favorites';
  const commandDisplay = command.name || command.command.substring(0, 30) + (command.command.length > 30 ? '...' : '');
  window.showInformationMessage(`⭐ Command "${commandDisplay}" ${statusText}`);

  // Show favorites statistics if added to favorites
  if (newFavoriteStatus) {
    const allCommands = storage.getAllCommands();
    const favoriteCount = allCommands.filter(cmd => cmd.isFavorite).length;
    if (favoriteCount > 0) {
      window.showInformationMessage(`You now have ${favoriteCount} favorite command(s). Use Ctrl+Shift+F to toggle favorites quickly.`);
    }
  }
}

/**
 * Legacy handler - delegate to new prepared commands system
 */
export async function handleRunPreparedCommand(commandString: string): Promise<void> {
  return handlePreparedCommand(commandString, storage.getContext());
}

/**
 * Handle running command and tracking usage
 */
export async function handleRunAndTrackCommand(item: TreeItem): Promise<void> {
  if (!item.id) return;
  const command = treeDataProvider.getCommandById(item.id);
  if (!command) return;

  // Update usage statistics
  const usageCount = (command.usageCount || 0) + 1;
  const updates: Partial<CommandInput> = {
    usageCount: usageCount,
    lastUsed: Date.now()
  };

  // Check if command should be promoted to "most-used" category
  // Note: We don't change the category to 'most-used' as this would hide it from its original category
  // Instead, the "Most Used" section will show commands based on usage count
  const mostUsedThreshold = workspace.getConfiguration('dotcommand').get<number>('mostUsedThreshold', 5);
  if (usageCount >= mostUsedThreshold && command.category !== 'most-used') {
    // Don't update category - let it remain in its original category
    // The "Most Used" section will filter by usage count, not by category
    // Removed: updates.category = 'most-used';
    // Removed: window.showInformationMessage(`🔥 Command promoted to "Most Used" category`);
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
      commandText = (commandLineValue as { value?: string }).value || '';
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
    const { getActiveShellType } = await import('../commands/cleaning');
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

    // Auto-detect category for terminal commands
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

/**
 * Handle adding a prepared command to user's "My Commands" section
 */
export async function handleAddToMyCommands(item: TreeItem): Promise<void> {
  try {
    // Find the prepared command by looking up in preparedCommands.ts
    const { getPreparedCommandsForCategory, getPreparedCommandCategories } = await import('../commands/prepared');
    const allCategories = getPreparedCommandCategories();
    let preparedCommand: PreparedCommand | undefined = undefined;

    // Search through all categories to find the command
    for (const category of allCategories) {
      const commands = getPreparedCommandsForCategory(category);
      preparedCommand = commands.find((cmd: PreparedCommand) =>
        cmd.name === item?.label ||
        cmd.command === (item?.description || item?.command)
      );
      if (preparedCommand) break;
    }

    if (!preparedCommand) {
      window.showErrorMessage('Could not find the prepared command to add');
      return;
    }

    // Create a user command from the prepared command
    const commandData: CommandInput = {
      command: preparedCommand.command,
      name: preparedCommand.name,
      category: 'my-prepared'
    };

    // Check if user already has this command
    if (storage.commandExists(commandData.command)) {
      const overwrite = await window.showWarningMessage(
        `This command already exists in your commands. Do you want to add it again?`,
        'Yes',
        'No'
      );

      if (overwrite !== 'Yes') {
        return;
      }
    }

    // Save as user command
    await storage.saveCommand(commandData);

    // Refresh the tree view to show the new command
    treeDataProvider.refresh();

    // Show success message
    const displayName = preparedCommand.name || preparedCommand.command.substring(0, 50) + (preparedCommand.command.length > 50 ? '...' : '');
    window.showInformationMessage(`Added to My Commands: ${displayName}`);

  } catch (error) {
    console.error('Error adding prepared command to My Commands:', error);
    window.showErrorMessage(`Failed to add command: ${error}`);
  }
}

/**
 * Handle moving a user-prepared task (from tasks.dotcommand) to user's "My Commands" section
 */
export async function handleMoveToMyCommands(item: TreeItem | { task?: DotCommandTask; label?: string; title?: string; description?: string; command?: string; id?: string }): Promise<void> {
  try {
    // The item should contain task data from the tasks.dotcommand file
    let taskLabel = '';
    let taskCommand = '';
    let taskCategory = '';

    // Extract task information from different possible formats
    if (typeof item === 'object' && item !== null) {
      // Check if it's our custom object type with task property
      const customItem = item as { task?: DotCommandTask; label?: string; title?: string; description?: string; command?: string; id?: string };
      if (customItem.task) {
        // Task object directly provided
        const task = customItem.task;
        taskLabel = task.label || task.name || '';
        taskCommand = task.command;
        taskCategory = task.category || '';
      } else {
        // Task data from tree item
        taskLabel = (typeof item.label === 'string' ? item.label : '') || (customItem.title || '');
        taskCommand = (typeof item.description === 'string' ? item.description : '') || (customItem.command || '');
        // Extract category from ID or context
        if (item.id && item.id.includes('_task_')) {
          // This is a user-prepared task - we need to look up category
          const { readTasksDotCommand } = await import('../providers/taskProvider');
          const userTasks = await readTasksDotCommand();
          const matchingTask = userTasks.find((t: DotCommandTask) => t.label === taskLabel && t.command === taskCommand);
          if (matchingTask) {
            taskCategory = matchingTask.category || '';
          }
        }
      }
    }

    if (!taskCommand) {
      window.showErrorMessage('Could not identify the task to move');
      return;
    }

    // Create a user command from the task
    const commandData: CommandInput = {
      command: taskCommand,
      name: taskLabel || undefined,
      category: taskCategory || 'my-prepared-tasks'
    };

    // Check if user already has this command
    if (storage.commandExists(commandData.command)) {
      const overwrite = await window.showWarningMessage(
        `This command already exists in your My Commands. Do you want to add it again?`,
        'Yes',
        'No'
      );

      if (overwrite !== 'Yes') {
        return;
      }
    }

    // Save as user command
    await storage.saveCommand(commandData);

    // Refresh the tree view to show the new command
    treeDataProvider.refresh();

    // Show success message
    const displayName = taskLabel || taskCommand.substring(0, 50) + (taskCommand.length > 50 ? '...' : '');
    window.showInformationMessage(`Moved to My Commands: ${displayName}`);

  } catch (error) {
    console.error('Error moving task to My Commands:', error);
    window.showErrorMessage(`Failed to move task: ${error}`);
  }
}

/**
 * Handle creating a new task template based on user's choice
 */
export async function handleCreateNewTaskTemplate(): Promise<void> {
  try {
    // Show template selection options
    const selectedTemplate = await window.showQuickPick(
      [
        {
          label: 'NPM Project',
          detail: 'Node.js project with npm scripts (build, dev, test, etc.)',
          value: 'npm'
        },
        {
          label: 'Git Repository',
          detail: 'Version control commands (status, commit, push, pull)',
          value: 'git'
        },
        {
          label: 'Docker Container',
          detail: 'Docker development workflow (build, run, deploy)',
          value: 'docker'
        },
        {
          label: 'Custom Project',
          detail: 'Generic development tasks for any project type',
          value: 'custom'
        },
        {
          label: 'Python Project',
          detail: 'Python development with pip, venv, testing',
          value: 'python'
        },
        {
          label: 'React/Vue/Angular',
          detail: 'Frontend framework development workflow',
          value: 'frontend'
        }
      ],
      {
        placeHolder: 'Select a project template to create tasks for',
        matchOnDetail: true
      }
    );

    if (!selectedTemplate) {
      return; // User cancelled
    }

    const workspaceFolder = workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      window.showErrorMessage('No workspace folder found');
      return;
    }

    const vscodeUri = workspaceFolder.uri.with({ path: workspaceFolder.uri.path + '/.vscode' });
    const tasksUri = vscodeUri.with({ path: vscodeUri.path + '/tasks.json' });

    // Check if tasks.json already exists
    let existingTasks = null;
    try {
      const existingFile = await workspace.fs.readFile(tasksUri);
      existingTasks = JSON.parse(new TextDecoder().decode(existingFile));
    } catch {
      // File doesn't exist, we'll create it
    }

    let finalTasksData;

    if (existingTasks && existingTasks.preparedTasks && existingTasks.preparedTasks.length > 0) {
      // Tasks.json exists - ask user what to do
      const userChoice = await window.showQuickPick(
        [
          {
            label: 'Add to existing tasks',
            detail: `Add ${selectedTemplate.label} tasks to your existing ${existingTasks.preparedTasks.length} tasks`,
            value: 'add'
          },
          {
            label: 'Replace all tasks',
            detail: 'Replace existing tasks with new template (backup recommended)',
            value: 'replace'
          },
          {
            label: 'Cancel',
            detail: 'Keep existing tasks unchanged',
            value: 'cancel'
          }
        ],
        {
          placeHolder: `.vscode/tasks.json already exists with ${existingTasks.preparedTasks.length} tasks. What would you like to do?`,
          matchOnDetail: true
        }
      );

      if (!userChoice || userChoice.value === 'cancel') {
        return; // User cancelled
      }

      if (userChoice.value === 'add') {
        // Add new template tasks to existing tasks
        const newTasks = await generateTaskTemplate(selectedTemplate.value);
        finalTasksData = {
          version: existingTasks.version || "1.0.0",
          preparedTasks: [...existingTasks.preparedTasks, ...newTasks.preparedTasks]
        };

        const addCount = newTasks.preparedTasks.length;
        window.showInformationMessage(`Added ${addCount} ${selectedTemplate.label} tasks to existing ${existingTasks.preparedTasks.length} tasks`);

      } else if (userChoice.value === 'replace') {
        // Replace all tasks with new template
        finalTasksData = await generateTaskTemplate(selectedTemplate.value);
        window.showInformationMessage(`Replaced existing tasks with ${selectedTemplate.label} template (${finalTasksData.preparedTasks.length} tasks)`);
      }

    } else {
      // No existing tasks.json - create new one
      finalTasksData = await generateTaskTemplate(selectedTemplate.value);
      window.showInformationMessage(`Created ${selectedTemplate.label} template with ${finalTasksData.preparedTasks.length} basic tasks`);
    }

    // Save the final tasks data
    const tasksJson = JSON.stringify(finalTasksData, null, 2);
    await workspace.fs.writeFile(tasksUri, new TextEncoder().encode(tasksJson));

    // Automatically add all new tasks to My Commands (only the newly added ones)
    if (finalTasksData) {
      const newTasksOnly = existingTasks
        ? finalTasksData.preparedTasks.slice(existingTasks.preparedTasks.length)
        : finalTasksData.preparedTasks;

      if (newTasksOnly.length > 0) {
        await autoAddTasksToMyCommands(newTasksOnly);
      }
    }

    // Refresh views to show new tasks
    if (treeDataProvider) {
      treeDataProvider.refresh();
    }

  } catch (error) {
    console.error('Error creating task template:', error);
    window.showErrorMessage(`Failed to create task template: ${error}`);
  }
}

/**
 * Generate task template based on project type
 */
async function generateTaskTemplate(templateType: string): Promise<TaskTemplate> {
  const baseTasks: TaskTemplate = {
    version: "1.0.0",
    preparedTasks: []
  };

  switch (templateType) {
    case 'npm':
      baseTasks.preparedTasks = [
        // Build & Dev
        { label: "Install Dependencies", command: "npm install", description: "Install all project dependencies", category: "Setup" },
        { label: "Start Development", command: "npm run dev", description: "Start development server", category: "Development" },
        { label: "Start Production", command: "npm run start", description: "Start production server", category: "Development" },
        { label: "Build Project", command: "npm run build", description: "Build for production", category: "Build" },
        // Testing
        { label: "Run Tests", command: "npm run test", description: "Run test suite", category: "Testing" },
        { label: "Run Tests Watch", command: "npm run test:watch", description: "Run tests in watch mode", category: "Testing" },
        // Code Quality
        { label: "Run Linter", command: "npm run lint", description: "Check code quality", category: "Code Quality" },
        { label: "Format Code", command: "npm run format", description: "Format code with prettier", category: "Code Quality" },
        // Maintenance
        { label: "Clean Cache", command: "npm run clean", description: "Clean build cache", category: "Maintenance" },
        { label: "Audit Packages", command: "npm audit", description: "Check security vulnerabilities", category: "Maintenance" },
        { label: "Update Packages", command: "npm update", description: "Update dependencies", category: "Maintenance" }
      ];
      break;

    case 'git':
      baseTasks.preparedTasks = [
        { label: "Check Status", command: "git status", description: "View working directory status", category: "Status" },
        { label: "Add All Changes", command: "git add .", description: "Stage all modified files", category: "Staging" },
        { label: "Commit Changes", command: "git commit -m \"updates\"", description: "Commit staged changes", category: "Commit" },
        { label: "Push to Main", command: "git push origin main", description: "Push commits to main branch", category: "Sync" },
        { label: "Pull from Main", command: "git pull origin main", description: "Pull latest changes", category: "Sync" },
        { label: "View History", command: "git log --oneline", description: "View recent commit history", category: "History" },
        { label: "Create Branch", command: "git checkout -b feature/new-feature", description: "Create and switch to new branch", category: "Branching" },
        { label: "Switch Branch", command: "git checkout main", description: "Switch to existing branch", category: "Branching" },
        { label: "Merge Branch", command: "git merge feature/branch", description: "Merge branch into current", category: "Branching" }
      ];
      break;

    case 'docker':
      baseTasks.preparedTasks = [
        { label: "Build Image", command: "docker build -t myapp .", description: "Build Docker image", category: "Build" },
        { label: "Run Container", command: "docker run -p 3000:3000 myapp", description: "Run container locally", category: "Development" },
        { label: "List Images", command: "docker images", description: "View all Docker images", category: "Management" },
        { label: "List Containers", command: "docker ps -a", description: "View all containers", category: "Management" },
        { label: "Stop Container", command: "docker stop container_id", description: "Stop running container", category: "Management" },
        { label: "Remove Container", command: "docker rm container_id", description: "Remove container", category: "Cleanup" },
        { label: "Docker Compose Up", command: "docker-compose up -d", description: "Start all services", category: "Compose" },
        { label: "Docker Compose Down", command: "docker-compose down", description: "Stop all services", category: "Compose" },
        { label: "Prune System", command: "docker system prune -f", description: "Clean up unused resources", category: "Cleanup" }
      ];
      break;

    case 'python':
      baseTasks.preparedTasks = [
        { label: "Create Virtual Env", command: "python -m venv venv", description: "Create virtual environment", category: "Setup" },
        { label: "Activate Virtual Env", command: "source venv/bin/activate", description: "Activate virtual environment", category: "Setup" },
        { label: "Install Requirements", command: "pip install -r requirements.txt", description: "Install dependencies", category: "Dependencies" },
        { label: "Run Python Script", command: "python main.py", description: "Run main Python script", category: "Execution" },
        { label: "Run Tests", command: "python -m pytest", description: "Run test suite", category: "Testing" },
        { label: "Format Code", command: "black .", description: "Format code with black", category: "Code Quality" },
        { label: "Lint Code", command: "flake8 .", description: "Check code quality", category: "Code Quality" },
        { label: "Generate Requirements", command: "pip freeze > requirements.txt", description: "Update requirements file", category: "Dependencies" }
      ];
      break;

    case 'frontend':
      baseTasks.preparedTasks = [
        { label: "Start Development", command: "npm run dev", description: "Start development server", category: "Development" },
        { label: "Build Production", command: "npm run build", description: "Build for production", category: "Build" },
        { label: "Start Production", command: "npm run preview", description: "Preview production build", category: "Deployment" },
        { label: "Run Tests", command: "npm run test", description: "Run test suite", category: "Testing" },
        { label: "Run E2E Tests", command: "npm run test:e2e", description: "Run end-to-end tests", category: "Testing" },
        { label: "Lint Code", command: "npm run lint", description: "Check code quality", category: "Code Quality" },
        { label: "Format Code", command: "npm run format", description: "Format code", category: "Code Quality" },
        { label: "Type Check", command: "npm run type-check", description: "Run TypeScript checks", category: "Code Quality" }
      ];
      break;

    case 'custom':
    default:
      baseTasks.preparedTasks = [
        { label: "Setup Environment", command: "echo 'Setup commands here'", description: "Environment setup tasks", category: "Setup" },
        { label: "Run Development", command: "echo 'Development command'", description: "Start development workflow", category: "Development" },
        { label: "Build Project", command: "echo 'Build command'", description: "Build project artifacts", category: "Build" },
        { label: "Run Tests", command: "echo 'Test command'", description: "Execute test suite", category: "Testing" },
        { label: "Deploy Application", command: "echo 'Deploy command'", description: "Deploy to staging/production", category: "Deployment" },
        { label: "Check Health", command: "echo 'Health check'", description: "Check application health", category: "Monitoring" }
      ];
      break;
  }

  return baseTasks;
}

/**
 * Handle testing a command before saving or from tree
 */
export async function handleTestCommand(treeItem?: TreeItem): Promise<void> {
  try {
    let commandToTest = '';
    let nameToShow = '';

    // If called from tree item context menu
    if (treeItem) {
      if (!treeItem.id) return;
      const command = treeDataProvider.getCommandById(treeItem.id);
      if (command) {
        commandToTest = command.command;
        nameToShow = command.name || ""; 
      } else {
        window.showErrorMessage('Could not find the command to test');
        return;
      }
    } else {
      // Get the currently selected text or active editor content
      const activeEditor = window.activeTextEditor;
      let selectedText = '';

      if (activeEditor) {
        // Get selected text if any, otherwise get current line
        selectedText = activeEditor.document.getText(activeEditor.selection) ||
                       activeEditor.document.lineAt(activeEditor.selection.active.line).text.trim();
      }

      // Show input box for command if no selection
      commandToTest = selectedText;
      if (!commandToTest.trim()) {
        commandToTest = await window.showInputBox({
          prompt: 'Enter the command to test',
          placeHolder: 'e.g., npm install lodash',
          validateInput: (value: string) => {
            if (!value || value.trim().length === 0) {
              return 'Command cannot be empty';
            }
            return null;
          }
        }) || '';

        if (!commandToTest.trim()) {
          return; // User cancelled
        }
      }
    }

    // Validate the command
    const validationResult = await CommandValidator.validateCommand(commandToTest, nameToShow || "");

    // Show test results in webview
    const testWebview = CommandTestWebview.getInstance();

    // Set up message handler for webview actions - different behavior for tree vs save
    testWebview.setMessageHandler(async (message: WebviewMessage) => {
      switch (message.type) {
        case 'save':
          if (treeItem) {
            // From tree - just close webview
            testWebview.dispose();
            window.showInformationMessage('Command analysis complete');
          } else {
            // Proceed to save the command
            testWebview.dispose(); // Close the webview
            await proceedWithSave(commandToTest);
          }
          break;
        case 'edit':
          if (treeItem) {
            // From tree - close and show info
            testWebview.dispose();
            window.showInformationMessage('Command analysis complete - review results above');
          } else {
            // Close webview to allow editing
            testWebview.dispose();
            // Re-run test command to restart the flow
            await handleTestCommand();
          }
          break;
        case 'cancel':
          // Just close the webview
          testWebview.dispose();
          break;
      }
    });

    // Show the validation results
    await testWebview.showTestResults(commandToTest, validationResult, nameToShow?.trim() || "");

    // Update button text for tree item testing
    if (treeItem) {
      // Use a custom message handler to show different buttons for analysis vs saving
      testWebview.setMessageHandler(async (message: WebviewMessage) => {
        switch (message.type) {
          case 'save':
            testWebview.dispose();
            window.showInformationMessage('Command analysis complete');
            break;
          case 'edit':
            testWebview.dispose();
            window.showInformationMessage('Command analysis shown - review results above');
            break;
          case 'cancel':
            testWebview.dispose();
            break;
        }
      });
    }

  } catch (error) {
    console.error('Error testing command:', error);
    window.showErrorMessage(`Failed to test command: ${error}`);
  }
}

/**
 * Proceed to save a command (called from webview)
 */
async function proceedWithSave(command: string, name?: string): Promise<void> {
  try {
    // Show input box for category (optional)
    const categoryInput = await window.showInputBox({
      prompt: 'Enter a category for this command (optional)',
      placeHolder: 'e.g., npm, git, docker',
      value: undefined
    });

    // Auto-detect category based on command content
    let autoCategory = categoryInput?.trim();
    if (!autoCategory) {
      const { detectCommandCategory } = await import('../commands/detection');
      autoCategory = detectCommandCategory(command.trim().toLowerCase());
    }

    // Prepare command data
    const commandData: CommandInput = {
      command: command.trim(),
      name: name?.trim() || undefined,
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
    await storage.saveCommand(commandData);

    // Refresh the tree view to show the new command
    treeDataProvider.refresh();

    // Show success message
    window.showInformationMessage(`Command saved successfully`);

  } catch (error) {
    console.error('Error saving command:', error);
    window.showErrorMessage(`Failed to save command: ${error}`);
  }
}

/**
 * Handle showing command history
 */
export async function handleShowCommandHistory(): Promise<void> {
  try {
    const historyManager = getCommandHistoryManager();
    const history = historyManager.getRecentCommands(20);

    if (history.length === 0) {
      window.showInformationMessage('No command history available yet. Run some commands first!');
      return;
    }

    // Show history in a quick pick for selection
    const items = history.map(cmd => ({
      label: cmd.command,
      description: `${new Date(cmd.timestamp).toLocaleString()} (${cmd.source})`,
      detail: cmd.terminalName ? `Terminal: ${cmd.terminalName}` : undefined,
      command: cmd
    }));

    const selected = await window.showQuickPick(items, {
      placeHolder: 'Select a command to re-run',
      matchOnDescription: true
    });

    if (selected) {
      // Re-run the selected command
      const terminalManager = getTerminalManager();
      const terminal = terminalManager.getOrCreateTerminal(selected.command.command, storage.getContext());

      terminalManager.trackCommand(terminal.name, selected.command.command);
      await historyManager.trackCommand(selected.command.command, 'manual', terminal.name);

      await commands.executeCommand('workbench.action.terminal.focus');
      terminal.show(true);

      setTimeout(() => {
        terminal.sendText(selected.command.command);
        window.showInformationMessage(`Re-running: ${selected.command.command}`);
      }, 500);
    }

  } catch (error) {
    console.error('Error showing command history:', error);
    window.showErrorMessage(`Failed to show command history: ${error}`);
  }
}

/**
 * Handle searching command history
 */
export async function handleSearchCommandHistory(): Promise<void> {
  try {
    const searchQuery = await window.showInputBox({
      prompt: 'Search command history',
      placeHolder: 'Enter search term (e.g., "git", "npm install")'
    });

    if (!searchQuery || !searchQuery.trim()) {
      return;
    }

    const historyManager = getCommandHistoryManager();
    const results = historyManager.searchHistory(searchQuery.trim(), 20);

    if (results.length === 0) {
      window.showInformationMessage(`No commands found matching "${searchQuery}"`);
      return;
    }

    // Show search results
    const items = results.map(cmd => ({
      label: cmd.command,
      description: `${new Date(cmd.timestamp).toLocaleString()} (${cmd.source})`,
      detail: cmd.terminalName ? `Terminal: ${cmd.terminalName}` : undefined,
      command: cmd
    }));

    const selected = await window.showQuickPick(items, {
      placeHolder: `Found ${results.length} commands matching "${searchQuery}"`,
      matchOnDescription: true
    });

    if (selected) {
      // Re-run the selected command
      const terminalManager = getTerminalManager();
      const terminal = terminalManager.getOrCreateTerminal(selected.command.command, storage.getContext());

      terminalManager.trackCommand(terminal.name, selected.command.command);
      await historyManager.trackCommand(selected.command.command, 'manual', terminal.name);

      await commands.executeCommand('workbench.action.terminal.focus');
      terminal.show(true);

      setTimeout(() => {
        terminal.sendText(selected.command.command);
        window.showInformationMessage(`Re-running: ${selected.command.command}`);
      }, 500);
    }

  } catch (error) {
    console.error('Error searching command history:', error);
    window.showErrorMessage(`Failed to search command history: ${error}`);
  }
}

/**
 * Handle showing command history statistics
 */
export async function handleShowCommandHistoryStats(): Promise<void> {
  try {
    const historyManager = getCommandHistoryManager();
    const stats = historyManager.getStats();

    const statsMessage = `📊 Command History Statistics

📈 Total Commands Executed: ${stats.totalCommands}
📅 Commands Today: ${stats.todayCommands}
📆 Commands This Week: ${stats.weekCommands}
⭐ Favorite Commands: ${stats.favoriteCommands}
🔥 Most Used Command: ${stats.mostUsedCommand ? stats.mostUsedCommand.command : 'None yet'}

💡 Tip: Use "DotCommand: Search History" to find and re-run commands!`;

    window.showInformationMessage(statsMessage);

  } catch (error) {
    console.error('Error showing command history stats:', error);
    window.showErrorMessage(`Failed to show command history stats: ${error}`);
  }
}

/**
 * Handle showing analytics and usage insights
 */
export async function handleShowAnalytics(): Promise<void> {
  try {
    const allCommands = storage.getAllCommands();
    const deletedCommands = storage.getDeletedCommands();

    // Calculate analytics
    const totalCommands = allCommands.length;
    const favoriteCommands = allCommands.filter(cmd => cmd.isFavorite);
    const mostUsedThreshold = workspace.getConfiguration('dotcommand').get<number>('mostUsedThreshold', 5);
    const mostUsedCommands = allCommands.filter(cmd => (cmd.usageCount || 0) >= mostUsedThreshold);

    // Category breakdown
    const categoryStats = new Map<string, number>();
    allCommands.forEach(cmd => {
      const category = cmd.category || 'Uncategorized';
      categoryStats.set(category, (categoryStats.get(category) || 0) + 1);
    });

    // Usage statistics
    const totalUsage = allCommands.reduce((sum, cmd) => sum + (cmd.usageCount || 0), 0);
    const averageUsage = totalCommands > 0 ? (totalUsage / totalCommands).toFixed(1) : '0';

    // Recent activity (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentCommands = allCommands.filter(cmd => cmd.lastUsed && cmd.lastUsed > sevenDaysAgo);

    // Build analytics message
    let analyticsMessage = `📊 DotCommand Analytics\n\n`;
    analyticsMessage += `📈 Total Commands: ${totalCommands}\n`;
    analyticsMessage += `⭐ Favorites: ${favoriteCommands.length}\n`;
    analyticsMessage += `🔥 Most Used (${mostUsedThreshold}+ runs): ${mostUsedCommands.length}\n`;
    analyticsMessage += `🗑️ In Trash: ${deletedCommands.length}\n\n`;

    analyticsMessage += `📊 Usage Statistics:\n`;
    analyticsMessage += `• Total runs: ${totalUsage}\n`;
    analyticsMessage += `• Average runs per command: ${averageUsage}\n`;
    analyticsMessage += `• Recently used (7 days): ${recentCommands.length}\n\n`;

    analyticsMessage += `📂 Category Breakdown:\n`;
    Array.from(categoryStats.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([category, count]) => {
        analyticsMessage += `• ${category}: ${count}\n`;
      });

    if (mostUsedCommands.length > 0) {
      analyticsMessage += `\n🔥 Top Most Used Commands:\n`;
      mostUsedCommands
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 3)
        .forEach(cmd => {
          const name = cmd.name || cmd.command.substring(0, 30) + (cmd.command.length > 30 ? '...' : '');
          analyticsMessage += `• ${name} (${cmd.usageCount} runs)\n`;
        });
    }

    // Show analytics in information message with actions
    const action = await window.showInformationMessage(
      analyticsMessage,
      'View Most Used',
      'View Favorites',
      'View Trash'
    );

    switch (action) {
      case 'View Most Used':
        commands.executeCommand('dotcommand.commandsView.focus');
        // Focus on most used section - this would require additional implementation
        break;
      case 'View Favorites':
        commands.executeCommand('dotcommand.commandsView.focus');
        // Focus on favorites section - this would require additional implementation
        break;
      case 'View Trash':
        commands.executeCommand('dotcommand.viewTrash');
        break;
    }

  } catch (error) {
    console.error('Error showing analytics:', error);
    window.showErrorMessage(`Failed to show analytics: ${error}`);
  }
}

/**
 * Handle showing available command templates
 */
export async function handleShowCommandTemplates(): Promise<void> {
  try {
    const templateManager = getTemplateManager();
    const userTemplates = templateManager.getAllTemplates();
    const predefinedCategories = templateManager.getPredefinedCategories();

    // Combine user templates and predefined templates
    const allCategories = [
      ...predefinedCategories,
      {
        name: 'My Templates',
        description: 'Your custom command templates',
        icon: 'tools',
        templates: userTemplates
      }
    ];

    // Create quick pick items for categories
    const categoryItems = allCategories.map(category => ({
      label: category.name,
      description: category.description,
      detail: `${category.templates.length} templates available`,
      category: category
    }));

    const selectedCategory = await window.showQuickPick(categoryItems, {
      placeHolder: 'Select a template category',
      matchOnDescription: true
    });

    if (!selectedCategory) return;

    // Show templates in the selected category
    const templateItems = selectedCategory.category.templates.map(template => ({
      label: template.name,
      description: template.description,
      detail: `Variables: ${template.variables.length}`,
      template: template
    }));

    const selectedTemplate = await window.showQuickPick(templateItems, {
      placeHolder: `Select a template from ${selectedCategory.category.name}`,
      matchOnDescription: true
    });

    if (selectedTemplate) {
      // Execute the selected template
      await templateManager.executeTemplate(selectedTemplate.template.id);
    }

  } catch (error) {
    console.error('Error showing command templates:', error);
    window.showErrorMessage(`Failed to show command templates: ${error}`);
  }
}

/**
 * Handle creating a new command template
 */
export async function handleCreateCommandTemplate(): Promise<void> {
  try {
    // Get template name
    const templateName = await window.showInputBox({
      prompt: 'Enter template name',
      placeHolder: 'e.g., Custom Git Commit',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Template name is required';
        }
        return null;
      }
    });

    if (!templateName) return;

    // Get template description
    const templateDescription = await window.showInputBox({
      prompt: 'Enter template description',
      placeHolder: 'Brief description of what this template does'
    });

    if (!templateDescription) return;

    // Get the command template
    const commandTemplate = await window.showInputBox({
      prompt: 'Enter command template',
      placeHolder: 'e.g., git commit -m "{message}" - use {variable} for dynamic values',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Command template is required';
        }
        return null;
      }
    });

    if (!commandTemplate) return;

    // Get category
    const category = await window.showInputBox({
      prompt: 'Enter category (optional)',
      placeHolder: 'e.g., Git, Docker, NPM'
    });

    // Extract variables from template
    const variableRegex = /\{([^}]+)\}/g;
    const variables: TemplateVariable[] = [];
    let match;

    while ((match = variableRegex.exec(commandTemplate)) !== null) {
      const varName = match[1];
      if (!variables.find(v => v.name === varName)) {
        // Get variable details
        const varDescription = await window.showInputBox({
          prompt: `Description for variable "${varName}"`,
          placeHolder: `Describe what ${varName} should be`
        });

        if (!varDescription) continue;

        const defaultValue = await window.showInputBox({
          prompt: `Default value for "${varName}" (optional)`,
          placeHolder: 'Leave empty for no default'
        });

        variables.push({
          name: varName,
          description: varDescription,
          defaultValue: defaultValue || undefined,
          required: true
        });
      }
    }

    // Create the template
    const templateManager = getTemplateManager();
    const template = await templateManager.createTemplate({
      name: templateName.trim(),
      description: templateDescription.trim(),
      template: commandTemplate.trim(),
      category: category?.trim() || 'Custom',
      variables: variables
    });

    window.showInformationMessage(`Template "${template.name}" created successfully!`);

  } catch (error) {
    console.error('Error creating command template:', error);
    window.showErrorMessage(`Failed to create template: ${error}`);
  }
}

/**
 * Handle executing a command template by ID
 */
export async function handleExecuteCommandTemplate(templateId?: string): Promise<void> {
  try {
    const templateManager = getTemplateManager();

    let template: CommandTemplate | undefined;

    if (templateId) {
      template = templateManager.getTemplateById(templateId);
    } else {
      // Show template selection
      const templates = templateManager.getAllTemplates();
      if (templates.length === 0) {
        window.showInformationMessage('No templates available. Create one first!');
        return;
      }

      const items = templates.map(t => ({
        label: t.name,
        description: t.description,
        detail: `Variables: ${t.variables.length}`,
        template: t
      }));

      const selected = await window.showQuickPick(items, {
        placeHolder: 'Select a template to execute',
        matchOnDescription: true
      });

      if (!selected) return;
      template = selected.template;
    }

    if (template) {
      await templateManager.executeTemplate(template.id);
    }

  } catch (error) {
    console.error('Error executing command template:', error);
    window.showErrorMessage(`Failed to execute template: ${error}`);
  }
}

/**
 * Handle Quick Command Picker - fast searchable command execution
 */
export async function handleQuickCommandPicker(): Promise<void> {
  try {
    const historyManager = getCommandHistoryManager();
    const templateManager = getTemplateManager();

    // Collect all commands from different sources
    const allCommands: Array<{
      label: string;
      description: string;
      detail: string;
      command: string;
      source: string;
      category: string;
      usageCount?: number;
      lastUsed?: number;
    }> = [];

    // Add saved commands
    const savedCommands = storage.getAllCommands();
    savedCommands.forEach(cmd => {
      allCommands.push({
        label: cmd.name || cmd.command,
        description: cmd.command,
        detail: `Saved • ${cmd.category} • Used ${cmd.usageCount || 0} times`,
        command: cmd.command,
        source: 'saved',
        category: cmd.category || 'general',
        usageCount: cmd.usageCount,
        lastUsed: cmd.lastUsed
      });
    });

    // Add prepared commands
    const { getPreparedCommandsForCategory, getPreparedCommandCategories } = await import('../commands/prepared');
    const categories = getPreparedCommandCategories();
    categories.forEach(category => {
      const commands = getPreparedCommandsForCategory(category);
      commands.forEach(cmd => {
        allCommands.push({
          label: cmd.name,
          description: cmd.command,
          detail: `Prepared • ${category}`,
          command: cmd.command,
          source: 'prepared',
          category: category
        });
      });
    });

    // Add template commands
    const templates = templateManager.getAllTemplates();
    templates.forEach(template => {
      allCommands.push({
        label: template.name,
        description: template.template,
        detail: `Template • ${template.category} • ${template.variables.length} variables`,
        command: template.template,
        source: 'template',
        category: template.category,
        usageCount: template.usageCount,
        lastUsed: template.lastUsed
      });
    });

    // Add recent history commands (last 10 unique commands)
    const recentCommands = historyManager.getRecentCommands(20);
    const uniqueRecent = new Map<string, typeof recentCommands[0]>();
    recentCommands.forEach(cmd => {
      if (!uniqueRecent.has(cmd.command)) {
        uniqueRecent.set(cmd.command, cmd);
      }
    });

    Array.from(uniqueRecent.values()).slice(0, 10).forEach(cmd => {
      // Only add if not already in the list
      if (!allCommands.find(c => c.command === cmd.command)) {
        allCommands.push({
          label: cmd.command,
          description: `Recently executed`,
          detail: `History • ${cmd.source} • ${new Date(cmd.timestamp).toLocaleDateString()}`,
          command: cmd.command,
          source: 'history',
          category: cmd.category || 'recent'
        });
      }
    });

    // Sort by usage frequency and recency
    allCommands.sort((a, b) => {
      // Prioritize by usage count (descending)
      const usageA = a.usageCount || 0;
      const usageB = b.usageCount || 0;
      if (usageA !== usageB) return usageB - usageA;

      // Then by recency (descending)
      const recentA = a.lastUsed || 0;
      const recentB = b.lastUsed || 0;
      if (recentA !== recentB) return recentB - recentA;

      // Finally alphabetically
      return a.label.localeCompare(b.label);
    });

    // Create QuickPick items
    const quickPickItems = allCommands.map(cmd => ({
      label: cmd.label,
      description: cmd.description,
      detail: cmd.detail,
      command: cmd
    }));

    // Show QuickPick
    const selected = await window.showQuickPick(quickPickItems, {
      placeHolder: 'Search and execute commands...',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (selected) {
      const cmd = selected.command;

      // Handle different command sources
      if (cmd.source === 'template') {
        // Execute template
        const template = templates.find(t => t.template === cmd.command);
        if (template?.id) {
          await templateManager.executeTemplate(template.id);
        } else {
          window.showErrorMessage('Template not found or invalid');
        }
      } else {
        // Execute regular command
        const terminalManager = getTerminalManager();
        const terminal = terminalManager.getOrCreateTerminal(cmd.command, storage.getContext());

        // Track execution
        terminalManager.trackCommand(terminal.name, cmd.command);
        await historyManager.trackCommand(cmd.command, 'manual', terminal.name, cmd.category);

        // Execute
        await commands.executeCommand('workbench.action.terminal.focus');
        terminal.show(true);

        setTimeout(() => {
          terminal.sendText(cmd.command);
          window.showInformationMessage(`Executed: ${cmd.label}`);
        }, 500);
      }
    }

  } catch (error) {
    console.error('Error in Quick Command Picker:', error);
    window.showErrorMessage(`Quick Command Picker failed: ${error}`);
  }
}

/**
 * Handle showing favorite commands
 */
export async function handleShowFavorites(): Promise<void> {
  try {
    const favoriteCommands = storage.getAllCommands().filter(cmd => cmd.isFavorite);

    if (favoriteCommands.length === 0) {
      window.showInformationMessage('No favorite commands yet. Mark commands as favorites with ⭐ icon!');
      return;
    }

    // Show favorites in QuickPick for selection
    const items = favoriteCommands.map(cmd => ({
      label: cmd.name || cmd.command,
      description: cmd.command,
      detail: `Category: ${cmd.category} • Used ${cmd.usageCount || 0} times`,
      command: cmd
    }));

    const selected = await window.showQuickPick(items, {
      placeHolder: `Select a favorite command (${favoriteCommands.length} available)`,
      matchOnDescription: true
    });

    if (selected) {
      // Run the selected favorite command
      const terminalManager = getTerminalManager();
      const terminal = terminalManager.getOrCreateTerminal(selected.command.command, storage.getContext());

      terminalManager.trackCommand(terminal.name, selected.command.command);
      const historyManager = getCommandHistoryManager();
      await historyManager.trackCommand(selected.command.command, 'saved', terminal.name, selected.command.category);

      await commands.executeCommand('workbench.action.terminal.focus');
      terminal.show(true);

      setTimeout(() => {
        terminal.sendText(selected.command.command);
        window.showInformationMessage(`⭐ Running favorite: ${selected.label}`);
      }, 500);
    }

  } catch (error) {
    console.error('Error showing favorites:', error);
    window.showErrorMessage(`Failed to show favorites: ${error}`);
  }
}

/**
 * Handle showing recent commands
 */
export async function handleShowRecentCommands(): Promise<void> {
  try {
    const historyManager = getCommandHistoryManager();
    const recentCommands = historyManager.getRecentCommands(10);

    if (recentCommands.length === 0) {
      window.showInformationMessage('No recent commands yet. Run some commands first!');
      return;
    }

    // Show recent commands in QuickPick for selection
    const items = recentCommands.map(cmd => ({
      label: cmd.command,
      description: `Executed ${new Date(cmd.timestamp).toLocaleString()}`,
      detail: `Source: ${cmd.source} • Terminal: ${cmd.terminalName}`,
      command: cmd
    }));

    const selected = await window.showQuickPick(items, {
      placeHolder: `Select a recent command (${recentCommands.length} available)`,
      matchOnDescription: true
    });

    if (selected) {
      // Re-run the selected recent command
      const terminalManager = getTerminalManager();
      const terminal = terminalManager.getOrCreateTerminal(selected.command.command, storage.getContext());

      terminalManager.trackCommand(terminal.name, selected.command.command);
      await historyManager.trackCommand(selected.command.command, 'manual', terminal.name, selected.command.category);

      await commands.executeCommand('workbench.action.terminal.focus');
      terminal.show(true);

      setTimeout(() => {
        terminal.sendText(selected.command.command);
        window.showInformationMessage(`🔄 Re-running: ${selected.command.command}`);
      }, 500);
    }

  } catch (error) {
    console.error('Error showing recent commands:', error);
    window.showErrorMessage(`Failed to show recent commands: ${error}`);
  }
}

/**
 * Automatically add all generated tasks to My Commands
 */
async function autoAddTasksToMyCommands(tasks: PreparedTask[]): Promise<void> {
  let addedCount = 0;

  for (const task of tasks) {
    try {
      const commandData: CommandInput = {
        command: task.command,
        name: task.label,
        category: task.category || 'auto-generated'
      };

      // Only add if not already exists
      if (!storage.commandExists(commandData.command)) {
        await storage.saveCommand(commandData);
        addedCount++;
      }
    } catch (error) {
      console.warn(`Failed to auto-add task ${task.label}:`, error);
    }
  }

  if (addedCount > 0) {
    window.showInformationMessage(`Added ${addedCount} template tasks to My Commands for easy customization`);
  }
}
