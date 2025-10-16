import { workspace, Task, TaskProvider, TaskDefinition, ShellExecution, tasks, TaskScope, TaskGroup } from 'vscode';
import { CommandStorage } from './storage';
import { getPreparedCommandCategories, handlePreparedCommand } from './preparedCommands';
import { SavedCommand } from './types';

// Get prepared commands array from the module
function getPreparedCommands(): any[] {
  try {
    // Import the prepared commands array directly
    const module = require('./preparedCommands');
    if (module && module.PREPARED_COMMANDS) {
      return module.PREPARED_COMMANDS;
    }
  } catch (error) {
    console.log('Could not access PREPARED_COMMANDS directly:', error);
  }
  return [];
}

export interface DotCommandTask extends TaskDefinition {
  label: string;
  command: string;
  description?: string;
  category?: string;
  source: 'built-in' | 'user-saved' | 'project-prepared';
  parameters?: TaskParameter[];
}

export interface TaskParameter {
  name: string;
  description: string;
  defaultValue?: string;
  type?: 'string' | 'pickString' | 'boolean' | 'number';
  options?: string[];
}

/**
 * Reads user-defined tasks from tasks.dotcommand file
 */
export async function readTasksDotCommand(): Promise<DotCommandTask[]> {
  try {
    const workspaceFolder = workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return [];
    }

    // Try .vscode/tasks.json first, then root level variants for compatibility
    let tasksFileUri;
    let tasksFile;

    try {
      // Primary: .vscode/tasks.json (standard VS Code location)
      const vscodeUri = workspaceFolder.uri.with({ path: workspaceFolder.uri.path + '/.vscode' });
      tasksFileUri = vscodeUri.with({ path: vscodeUri.path + '/tasks.json' });
      tasksFile = await workspace.fs.readFile(tasksFileUri);
    } catch {
      try {
        // Fallback 1: tasks.json in root
        tasksFileUri = workspaceFolder.uri.with({ path: workspaceFolder.uri.path + '/tasks.json' });
        tasksFile = await workspace.fs.readFile(tasksFileUri);
      } catch {
        try {
          // Fallback 2: tasksDotcommand.json in root
          tasksFileUri = workspaceFolder.uri.with({ path: workspaceFolder.uri.path + '/tasksDotcommand.json' });
          tasksFile = await workspace.fs.readFile(tasksFileUri);
        } catch {
          // Fallback 3: legacy tasks.dotcommand
          tasksFileUri = workspaceFolder.uri.with({ path: workspaceFolder.uri.path + '/tasks.dotcommand' });
          tasksFile = await workspace.fs.readFile(tasksFileUri);
        }
      }
    }

    if (tasksFile.length === 0) {
      return [];
    }

    const tasksData = JSON.parse(new TextDecoder().decode(tasksFile));

    // Validate and convert user tasks
    const userTasks: DotCommandTask[] = [];
    if (tasksData.preparedTasks && Array.isArray(tasksData.preparedTasks)) {
      for (const task of tasksData.preparedTasks) {
        userTasks.push({
          ...task,
          source: 'project-prepared',
          type: 'dotcommand',
          label: task.label,
          command: task.command,
          description: task.description || '',
          category: task.category || 'Project Tasks',
          parameters: task.parameters || []
        });
      }
    }

    return userTasks;
  } catch (error) {
    // File doesn't exist or is invalid JSON - just return empty array
    console.log('tasks.dotcommand not found or invalid, using default tasks');
    return [];
  }
}

/**
 * Creates VS Code tasks from user-saved commands
 */
export function createTasksFromSavedCommands(storage: CommandStorage): DotCommandTask[] {
  const savedCommands = storage.getAllCommands();
  return savedCommands.map(cmd => ({
    type: 'dotcommand',
    label: `${cmd.name || 'Saved'}: ${cmd.command.substring(0, 30)}${cmd.command.length > 30 ? '...' : ''}`,
    command: cmd.command,
    description: `Saved command: ${cmd.name || cmd.command}`,
    category: cmd.category || 'Saved Commands',
    source: 'user-saved' as const
  }));
}

/**
 * Creates VS Code tasks from built-in prepared commands
 */
export function createTasksFromPreparedCommands(): DotCommandTask[] {
  const preparedCommands = getPreparedCommands();
  return preparedCommands.map((prepared: any) => ({
    type: 'dotcommand',
    label: `${prepared.name}`,
    command: prepared.command,
    description: `${prepared.description} (${prepared.category})`,
    category: prepared.category,
    source: 'built-in' as const,
    parameters: prepared.parameters
  }));
}

/**
 * Converts DotCommand tasks to VS Code Task objects
 */
export async function convertToVSTasks(dotCommandTasks: DotCommandTask[]): Promise<Task[]> {
  const vsTasks: Task[] = [];

  for (const dotCmd of dotCommandTasks) {
    // Build the final command with input variables if parameters exist
    let finalCommand = dotCmd.command;

    // Create task definition
    const taskDefinition: DotCommandTask = { ...dotCmd };

    // Create shell execution
    let shellExecution: ShellExecution;
    let args: string[] = [];

    if (dotCmd.parameters && dotCmd.parameters.length > 0) {
      // For parameterized commands, we need to handle input prompts
      // VS Code will handle the input prompts and replacements
      shellExecution = new ShellExecution(finalCommand);
    } else {
      // Simple commands without parameters
      shellExecution = new ShellExecution(finalCommand);
    }

    // Create VS Code task
    const task = new Task(
      taskDefinition,
      TaskScope.Workspace,
      dotCmd.label,
      'DotCommand',
      shellExecution,
      []
    );

    // Set group based on category
    if (dotCmd.category?.toLowerCase().includes('git')) {
      task.group = TaskGroup.Build;
    } else if (dotCmd.category?.toLowerCase().includes('npm') || dotCmd.category?.toLowerCase().includes('build')) {
      task.group = TaskGroup.Build;
    } else if (dotCmd.category?.toLowerCase().includes('test')) {
      task.group = TaskGroup.Test;
    }

    task.detail = dotCmd.description;

    vsTasks.push(task);
  }

  return vsTasks;
}

/**
 * DotCommand Task Provider - provides all tasks to VS Code
 */
export class DotCommandTaskProvider implements TaskProvider {
  private storage: CommandStorage;

  constructor(storage: CommandStorage) {
    this.storage = storage;
  }

  /**
   * Provide all tasks to VS Code
   */
  async provideTasks(): Promise<Task[]> {
    try {
      const allTasks: DotCommandTask[] = [];

      // 1. User-defined tasks from tasks.dotcommand file
      const userTasks = await readTasksDotCommand();
      allTasks.push(...userTasks);

      // 2. Tasks from user's saved commands (high frequency ones)
      const savedCommandTasks = createTasksFromSavedCommands(this.storage);
      const frequentCommands = savedCommandTasks.filter(task =>
        task.category === 'most-used' || task.category === 'favorites'
      );
      allTasks.push(...frequentCommands);

      // 3. Built-in prepared command tasks
      const preparedCommandTasks = createTasksFromPreparedCommands();
      allTasks.push(...preparedCommandTasks);

      // Convert to VS Code Task objects
      return convertToVSTasks(allTasks);
    } catch (error) {
      console.error('Error providing DotCommand tasks:', error);
      return [];
    }
  }

  /**
   * Resolve dynamic task (unused for this provider)
   */
  resolveTask(task: Task): Task | undefined {
    return task;
  }
}

/**
 * Register the DotCommand task provider with VS Code
 */
export function registerTaskProvider(storage: CommandStorage) {
  const provider = new DotCommandTaskProvider(storage);

  // Register the task provider
  const taskProviderDisposable = tasks.registerTaskProvider('dotcommand', provider);

  // Refresh tasks when configuration changes
  const configListener = workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('dotcommand')) {
      tasks.fetchTasks();
    }
  });

  // Refresh tasks when workspace changes (new task files)
  const fileChangeListener = workspace.onDidSaveTextDocument(document => {
    if (document.fileName.endsWith('tasks.dotcommand') ||
        document.fileName.endsWith('tasks.json') ||
        document.fileName === 'tasks.json') { // Specifically check for .vscode/tasks.json
      tasks.fetchTasks();
    }
  });

  // Return disposables
  return [taskProviderDisposable, configListener, fileChangeListener];
}
