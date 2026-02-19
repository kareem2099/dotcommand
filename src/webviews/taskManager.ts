import { window, workspace, WebviewPanel, Disposable, extensions, Uri } from 'vscode';
import { readTasksDotCommand } from '../providers/taskProvider';
import { getWebviewDevScript } from '../utils/logger';

interface DotCommandTask {
  label: string;
  command: string;
  description?: string;
  category?: string;
}

interface WebviewMessage {
  type: string;
  task?: DotCommandTask;
  index?: number;
  message?: string;
}

export class TaskManagerWebview {
  private static instance: TaskManagerWebview | undefined;
  private panel: WebviewPanel | undefined;
  private disposables: Disposable[] = [];
  private currentTasks: DotCommandTask[] = [];
  private currentTaskPath: string = '';

  public static getInstance(): TaskManagerWebview {
    if (!TaskManagerWebview.instance) {
      TaskManagerWebview.instance = new TaskManagerWebview();
    }
    return TaskManagerWebview.instance;
  }

  public async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    await this.loadTasks();

    this.panel = window.createWebviewPanel(
      'dotcommand.taskManager',
      'Task Manager',
      window.activeTextEditor?.viewColumn || 1,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = await this.getWebviewContent();

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      },
      undefined,
      this.disposables
    );

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.disposables.forEach(d => d.dispose());
        TaskManagerWebview.instance = undefined;
      },
      undefined,
      this.disposables
    );
  }

  private async getWebviewContent(): Promise<string> {
    try {
      // Get the extension path
      const extension = extensions.getExtension('freerave.dotcommand');
      if (!extension) {
        throw new Error('Extension not found');
      }

      const extensionUri = extension.extensionUri;

      // First try the compiled version (in out/resources)
      try {
        const htmlUri = extensionUri.with({ path: extensionUri.path + '/out/resources/taskmanager/index.html' });
        console.log('Trying compiled resource path:', htmlUri.toString());
      const htmlContent = await workspace.fs.readFile(htmlUri);
      const htmlText = new TextDecoder().decode(htmlContent);
      const nonce = getNonce();
      console.log('Generated nonce:', nonce);
      const result = htmlText
        .replace('{nonce}', nonce)
        .replace('</head>', `${getWebviewDevScript(nonce)}\n</head>`);
      console.log('CSP replaced content contains:', result.includes(nonce));
      return result;
      } catch {
        // Fall back to development resources
        try {
          const htmlUri = extensionUri.with({ path: extensionUri.path + '/resources/taskmanager/index.html' });
          console.log('Trying development resource path:', htmlUri.toString());
          const htmlContent = await workspace.fs.readFile(htmlUri);
          const htmlText = new TextDecoder().decode(htmlContent);
          const nonce = getNonce();
          return htmlText
            .replace('{nonce}', nonce)
            .replace('</head>', `${getWebviewDevScript(nonce)}\n</head>`);
        } catch (devError: unknown) {
          console.error('Could not load from development path:', devError);
          throw devError;
        }
      }
    } catch (error) {
      console.error('Error loading HTML file:', error);
      return `<!DOCTYPE html><html><body><h1>Error loading Task Manager</h1><p>Could not load the UI. Please check if the extension is properly installed. Error details: ${(error as Error).message}</p></body></html>`;
    }
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'addTask':
          if (message.task) {
            await this.addTask(message.task);
          }
          break;
        case 'updateTask':
          if (message.index !== undefined && message.task) {
            await this.updateTask(message.index, message.task);
          }
          break;
        case 'deleteTask':
          if (message.index !== undefined) {
            await this.deleteTask(message.index);
          }
          break;
        case 'runTask':
          if (message.index !== undefined) {
            await this.runTask(message.index);
          }
          break;
        case 'showInfo':
          if (message.message) {
            window.showInformationMessage(message.message);
          }
          break;
        case 'error':
          if (message.message) {
            window.showErrorMessage(message.message);
          }
          break;
      }
    } catch (_error) {
      console.error('Error handling webview message:', _error);
      window.showErrorMessage(`Operation failed: ${_error instanceof Error ? _error.message : String(_error)}`);
    }
  }

  private async loadTasks(): Promise<void> {
    try {
      this.currentTasks = await readTasksDotCommand();
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.currentTasks = [];
    }
  }

  private async addTask(task: DotCommandTask): Promise<void> {
    this.currentTasks.push(task);
    await this.saveTasks();
    await this.sendTasksToWebview();
  }

  private async updateTask(index: number, task: DotCommandTask): Promise<void> {
    if (index >= 0 && index < this.currentTasks.length) {
      this.currentTasks[index] = task;
      await this.saveTasks();
      await this.sendTasksToWebview();
    }
  }

  private async deleteTask(index: number): Promise<void> {
    if (index >= 0 && index < this.currentTasks.length) {
      this.currentTasks.splice(index, 1);
      await this.saveTasks();
      await this.sendTasksToWebview();
    }
  }

  private async runTask(index: number): Promise<void> {
    if (index >= 0 && index < this.currentTasks.length) {
      const task = this.currentTasks[index];
      const extension = extensions.getExtension('freerave.dotcommand');
      const iconPath = extension ? Uri.joinPath(extension.extensionUri, 'assets', 'icons', 'icon.png') : undefined;
      const terminal = window.createTerminal({
        name: 'DotCommand: ' + task.label,
        iconPath: iconPath
      });
      terminal.show();
      terminal.sendText(task.command);
      window.showInformationMessage('Running: ' + task.label);
    }
  }

  private async saveTasks(): Promise<void> {
    const workspaceFolder = workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    // Prioritize VS Code standard .vscode/tasks.json, then fallback to legacy formats
    const taskFiles = ['.vscode/tasks.json', 'tasks.dotcommand', 'tasks.json'];

    for (const fileName of taskFiles) {
      try {
        let fileUri;
        if (fileName === '.vscode/tasks.json') {
          const vscodeUri = workspaceFolder.uri.with({ path: workspaceFolder.uri.path + '/.vscode' });
          fileUri = vscodeUri.with({ path: vscodeUri.path + '/' + fileName });
        } else {
          fileUri = workspaceFolder.uri.with({ path: workspaceFolder.uri.path + '/' + fileName });
        }

        await workspace.fs.writeFile(fileUri, new TextEncoder().encode(JSON.stringify({
          version: "1.0.0",
          preparedTasks: this.currentTasks
        }, null, 2)));
        return;
      } catch {
        continue;
      }
    }

    throw new Error('Could not save tasks file');
  }

  private async sendTasksToWebview(): Promise<void> {
    if (this.panel) {
      this.panel.webview.postMessage({
        type: 'loadTasks',
        tasks: this.currentTasks
      });
    }
  }

  public dispose(): void {
    this.panel?.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
