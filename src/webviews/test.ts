import { Disposable, ViewColumn, WebviewPanel, window } from 'vscode';
import { ValidationLevel, ValidationResult } from '../commands/validator';
import { getWebviewDevScript } from '../utils/logger';

/**
 * Message types sent from the webview to the extension
 */
interface WebviewMessage {
  type: 'save' | 'edit' | 'cancel';
}

/**
 * Webview for displaying command test results
 */
export class CommandTestWebview {
  private static instance: CommandTestWebview | null = null;
  private panel: WebviewPanel | null = null;
  private disposables: Disposable[] = [];
  private messageHandlers: ((message: WebviewMessage) => void) | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): CommandTestWebview {
    if (!CommandTestWebview.instance) {
      CommandTestWebview.instance = new CommandTestWebview();
    }
    return CommandTestWebview.instance;
  }

  /**
   * Show the test results in the webview
   */
  public async showTestResults(
    command: string,
    result: ValidationResult,
    name?: string
  ): Promise<void> {
    // Create or reveal the webview panel
    if (!this.panel) {
      this.panel = window.createWebviewPanel(
        'dotcommand.testResults',
        'Command Test Results',
        ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: []
        }
      );

      // Set up panel event handlers
      this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
      this.panel.webview.onDidReceiveMessage(
        (message) => this.handleMessage(message),
        null,
        this.disposables
      );
    }

    // Update the webview content
    this.panel.webview.html = this.generateHtml(command, result, name);
    this.panel.reveal();
  }

  /**
   * Generate HTML content for the test results webview
   */
  private generateHtml(command: string, result: ValidationResult, name?: string): string {
    const iconMap = {
      [ValidationLevel.SAFE]: '✅',
      [ValidationLevel.WARNING]: '⚠️',
      [ValidationLevel.DANGEROUS]: '❌'
    };

    const colorMap = {
      [ValidationLevel.SAFE]: '#28a745',
      [ValidationLevel.WARNING]: '#ffc107',
      [ValidationLevel.DANGEROUS]: '#dc3545'
    };

    const checksHtml = result.checks.map(check => `
      <div class="check-item" style="border-left-color: ${colorMap[check.level]};">
        <div class="check-header">
          <span class="check-icon">${iconMap[check.level]}</span>
          <span class="check-message">${check.message}</span>
        </div>
        ${check.details ? `<div class="check-details">${check.details}</div>` : ''}
      </div>
    `).join('');

    const outputHtml = result.simulatedOutput ? `
      <div class="output-section">
        <h3>📝 Simulated Output</h3>
        <div class="output-content">
          ${result.simulatedOutput.map(line => `<div class="output-line">${this.escapeHtml(line)}</div>`).join('')}
        </div>
      </div>
    ` : '';

    const recommendationsHtml = result.recommendations && result.recommendations.length > 0 ? `
      <div class="recommendations-section">
        <h3>💡 Recommendations</h3>
        <ul class="recommendations-list">
          ${result.recommendations.map(rec => `<li>${this.escapeHtml(rec)}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        ${getWebviewDevScript()}
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Command Test Results</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background-color: #f8f9fa;
            color: #212529;
            line-height: 1.6;
          }

          .header {
            margin-bottom: 20px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .command-name {
            font-size: 16px;
            font-weight: 600;
            color: #495057;
            margin-bottom: 8px;
          }

          .command-text {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 14px;
            background: #f1f3f4;
            padding: 12px;
            border-radius: 4px;
            border-left: 4px solid #007acc;
            word-break: break-all;
          }

          .overall-level {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 12px;
            text-transform: uppercase;
          }

          .checks-section {
            margin-bottom: 20px;
          }

          .check-item {
            background: white;
            border-left: 4px solid #ccc;
            border-radius: 4px;
            margin-bottom: 12px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          .check-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
          }

          .check-icon {
            font-size: 18px;
            margin-right: 10px;
          }

          .check-message {
            font-weight: 600;
          }

          .check-details {
            color: #6c757d;
            font-size: 14px;
            margin-left: 28px;
          }

          .output-section, .recommendations-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .output-content {
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'SF Mono', Monaco, monospace;
            padding: 16px;
            border-radius: 4px;
            font-size: 13px;
            white-space: pre-wrap;
            overflow-x: auto;
          }

          .output-line {
            margin-bottom: 2px;
          }

          .recommendations-list {
            list-style: none;
            padding-left: 0;
          }

          .recommendations-list li {
            margin-bottom: 8px;
            padding: 8px 12px;
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            border-radius: 4px;
          }

          h3 {
            margin-bottom: 16px;
            color: #495057;
            font-size: 16px;
          }

          .actions {
            text-align: center;
            margin-top: 30px;
          }

          .btn {
            display: inline-block;
            padding: 10px 20px;
            margin: 0 10px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s;
          }

          .btn-save {
            background: #28a745;
            color: white;
          }

          .btn-save:hover {
            background: #218838;
          }

          .btn-edit {
            background: #007bff;
            color: white;
          }

          .btn-edit:hover {
            background: #0056b3;
          }

          .btn-cancel {
            background: #6c757d;
            color: white;
          }

          .btn-cancel:hover {
            background: #545b62;
          }

          /* Disable buttons for dangerous commands */
          .dangerous-mode .btn-save {
            background: #dc3545;
            cursor: not-allowed;
          }

          .dangerous-mode .btn-save:hover {
            background: #c82333;
          }
        </style>
      </head>
      <body class="${result.overallLevel === ValidationLevel.DANGEROUS ? 'dangerous-mode' : ''}">
        <div class="header">
          ${name ? `<div class="command-name">Name: ${this.escapeHtml(name)}</div>` : ''}
          <div class="command-text">${this.escapeHtml(command)}</div>
          <span class="overall-level" style="background-color: ${colorMap[result.overallLevel]}; color: white;">
            ${iconMap[result.overallLevel]} ${result.overallLevel}
          </span>
        </div>

        <div class="checks-section">
          <h3>🔍 Validation Results</h3>
          ${checksHtml}
        </div>

        ${outputHtml}
        ${recommendationsHtml}

        <div class="actions">
          <button class="btn btn-save" onclick="saveCommand()" ${result.overallLevel === ValidationLevel.DANGEROUS ? 'disabled' : ''}>
            Save Command
          </button>
          <button class="btn btn-edit" onclick="editCommand()">
            Edit Command
          </button>
          <button class="btn btn-cancel" onclick="cancel()">
            Close
          </button>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function saveCommand() {
            vscode.postMessage({ type: 'save' });
          }

          function editCommand() {
            vscode.postMessage({ type: 'edit' });
          }

          function cancel() {
            vscode.postMessage({ type: 'cancel' });
          }

          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'update':
                // Could update content dynamically
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const map = {
      '&': '&',
      '<': '<',
      '>': '>',
      '"': '"',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m as keyof typeof map]);
  }

  /**
   * Set message handler callback
   */
  public setMessageHandler(handler: (message: WebviewMessage) => void): void {
    this.messageHandlers = handler;
  }

  /**
   * Handle messages from the webview
   */
  private handleMessage(message: WebviewMessage): void {
    if (this.messageHandlers) {
      this.messageHandlers(message);
    }
  }

  /**
   * Dispose of the webview
   */
  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
    }

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    CommandTestWebview.instance = null;
  }
}
