import { ExtensionContext, WebviewPanel, window, ViewColumn, Uri, env } from 'vscode';
import { CommandStorage } from '../storage/storage';
import { CommandInput } from '../utils/types';

interface WebviewMessage {
  command: string;
  id?: string;
  updates?: Partial<CommandInput>;
}

export class CommandWebview {
  private panel: WebviewPanel | undefined;
  private storage: CommandStorage;

  constructor(private context: ExtensionContext) {
    this.storage = new CommandStorage(context);
  }

  /**
   * Show the command viewer webview
   */
  public show(): void {
    if (this.panel) {
      this.panel.reveal(ViewColumn.One);
    } else {
      this.createPanel();
    }
    this.updateContent();
  }

  /**
   * Refresh the webview content
   */
  public refresh(): void {
    if (this.panel) {
      this.updateContent();
    }
  }

  /**
   * Handle messages from the webview
   */
  private handleMessage(message: WebviewMessage): void {
    switch (message.command) {
      case 'getCommands':
        this.sendCommands();
        break;
      case 'copyCommand':
        this.copyCommandToClipboard(message.command);
        break;
      case 'deleteCommand':
        if (message.id) {
          this.deleteCommand(message.id);
        }
        break;
      case 'editCommand':
        if (message.id && message.updates) {
          this.editCommand(message.id, message.updates);
        }
        break;
    }
  }

  /**
   * Copy command to clipboard
   */
  private async copyCommandToClipboard(command: string): Promise<void> {
    await env.clipboard.writeText(command);

    // Notify webview that command was copied
    if (this.panel) {
      this.panel.webview.postMessage({
        command: 'commandCopied',
        copiedCommand: command
      });
    }
  }

  /**
   * Delete a command
   */
  private async deleteCommand(id: string): Promise<void> {
    try {
      const success = await this.storage.deleteCommand(id);
      if (success && this.panel) {
        this.panel.webview.postMessage({
          command: 'commandDeleted'
        });
      } else if (this.panel) {
        this.panel.webview.postMessage({
          command: 'error',
          message: 'Failed to delete command'
        });
      }
    } catch (error) {
      if (this.panel) {
        this.panel.webview.postMessage({
          command: 'error',
          message: `Error deleting command: ${error}`
        });
      }
    }
  }

  /**
   * Edit a command
   */
  private async editCommand(id: string, updates: Partial<CommandInput>): Promise<void> {
    try {
      const updatedCommand = await this.storage.updateCommand(id, updates);
      if (updatedCommand) {
        this.sendCommands(); // Refresh the list
      } else if (this.panel) {
        this.panel.webview.postMessage({
          command: 'error',
          message: 'Failed to update command'
        });
      }
    } catch (error) {
      if (this.panel) {
        this.panel.webview.postMessage({
          command: 'error',
          message: `Error updating command: ${error}`
        });
      }
    }
  }

  /**
   * Send commands to webview
   */
  private sendCommands(): void {
    if (!this.panel) return;

    const commands = this.storage.getAllCommands();
    this.panel.webview.postMessage({
      command: 'updateCommands',
      commands: commands
    });
  }

  /**
   * Create the webview panel
   */
  private createPanel(): void {
    this.panel = window.createWebviewPanel(
      'commandViewer',
      'Saved Commands',
      ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          this.context.extensionUri,
          Uri.joinPath(this.context.extensionUri, 'resources')
        ]
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, this.context.subscriptions);

    this.panel.webview.onDidReceiveMessage(
      this.handleMessage.bind(this),
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Update the webview content
   */
  private updateContent(): void {
    if (!this.panel) return;

    const commandCount = this.storage.getCommandCount();
    this.panel.title = `Saved Commands (${commandCount})`;
    this.panel.webview.html = this.getWebviewContent();
  }

  /**
   * Generate the HTML content for the webview
   */
  private getWebviewContent(): string {
    // Get URIs for the resource files
    const htmlUri = this.panel?.webview.asWebviewUri(
      Uri.joinPath(this.context.extensionUri, 'resources', 'webview.html')
    );

    if (!htmlUri) {
      // Fallback to simple loading page if URI can't be created
      return this.getFallbackContent();
    }

    // Return a simple HTML that redirects to our external files
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Saved Commands</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            margin: 0;
            padding: 0;
          }

          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-size: 16px;
            color: var(--vscode-descriptionForeground);
          }

          .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--vscode-panel-border);
            border-top: 2px solid var(--vscode-focusBorder);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="loading">
          <div class="spinner"></div>
          Loading DotCommand...
        </div>

        <script>
          // Redirect to the actual webview content
          window.location.href = '${htmlUri}';
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Fallback content if webview URIs can't be created
   */
  private getFallbackContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Saved Commands</title>
      </head>
      <body>
        <h1>DotCommand Webview</h1>
        <p>Unable to load webview resources. Please check the extension configuration.</p>
      </body>
      </html>
    `;
  }
}
