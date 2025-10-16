import { commands, window, workspace, TerminalShellExecutionStartEvent, env } from 'vscode';
import { CommandStorage } from './storage';
import { CommandsTreeDataProvider } from './treeView';
import { handlePreparedCommand } from './preparedCommands';
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
 * Legacy handler - delegate to new prepared commands system
 */
export async function handleRunPreparedCommand(commandString: string): Promise<void> {
  return handlePreparedCommand(commandString);
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

/**
 * Handle adding a prepared command to user's "My Commands" section
 */
export async function handleAddToMyCommands(item: any): Promise<void> {
  try {
    // Find the prepared command by looking up in preparedCommands.ts
    const preparedCommands = require('./preparedCommands').PREPARED_COMMANDS;
    const preparedCommand = preparedCommands.find((cmd: any) =>
      cmd.name === item?.label ||
      cmd.command === (item?.description || item?.command)
    );

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
    const savedCommand = await storage.saveCommand(commandData);

    // Refresh the tree view to show the new command
    treeDataProvider.refresh();

    // Show success message
    const displayName = savedCommand.name || savedCommand.command.substring(0, 50) + (savedCommand.command.length > 50 ? '...' : '');
    window.showInformationMessage(`Added to My Commands: ${displayName}`);

  } catch (error) {
    console.error('Error adding prepared command to My Commands:', error);
    window.showErrorMessage(`Failed to add command: ${error}`);
  }
}

/**
 * Handle moving a user-prepared task (from tasks.dotcommand) to user's "My Commands" section
 */
export async function handleMoveToMyCommands(item: any): Promise<void> {
  try {
    // The item should contain task data from the tasks.dotcommand file
    let taskLabel = '';
    let taskCommand = '';
    let taskDescription = '';
    let taskCategory = '';

    // Extract task information from different possible formats
    if (typeof item === 'object' && item !== null) {
      if (item.task) {
        // Task object directly provided
        const task = item.task;
        taskLabel = task.label || task.name || '';
        taskCommand = task.command;
        taskDescription = task.description || '';
        taskCategory = task.category || '';
      } else {
        // Task data from tree item
        taskLabel = item.label || item.title || '';
        taskCommand = item.description || item.command || '';
        taskDescription = item.tooltip || '';
        // Extract category from ID or context
        if (item.id && item.id.includes('_task_')) {
          // This is a user-prepared task - we need to look up category
          const { readTasksDotCommand } = require('./taskProvider');
          const userTasks = await readTasksDotCommand();
          const matchingTask = userTasks.find((t: any) => t.label === taskLabel && t.command === taskCommand);
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
    const savedCommand = await storage.saveCommand(commandData);

    // Refresh the tree view to show the new command
    treeDataProvider.refresh();

    // Show success message
    const displayName = savedCommand.name || savedCommand.command.substring(0, 50) + (savedCommand.command.length > 50 ? '...' : '');
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
    const newTasksOnly = existingTasks
      ? finalTasksData.preparedTasks.slice(existingTasks.preparedTasks.length)
      : finalTasksData.preparedTasks;

    if (newTasksOnly.length > 0) {
      await autoAddTasksToMyCommands(newTasksOnly);
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
async function generateTaskTemplate(templateType: string): Promise<any> {
  const baseTasks = {
    version: "1.0.0",
    preparedTasks: [] as any[]
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
 * Automatically add all generated tasks to My Commands
 */
async function autoAddTasksToMyCommands(tasks: any[]): Promise<void> {
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
