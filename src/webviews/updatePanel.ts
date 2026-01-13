import * as vscode from 'vscode';
import * as fs from 'fs';

export class UpdatePanel {
  public static currentPanel: UpdatePanel | undefined;
  public static readonly viewType = 'updatePanel';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (UpdatePanel.currentPanel) {
      UpdatePanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      UpdatePanel.viewType,
      'What\'s New in DotCommand',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
      }
    );

    UpdatePanel.currentPanel = new UpdatePanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'closePanel':
            this._panel.dispose();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    UpdatePanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.title = 'What\'s New in DotCommand';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'updatePanel.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'updatePanel.css'));

    // Read the changelog content
    const changelogPath = vscode.Uri.joinPath(this._extensionUri, 'CHANGELOG.md');
    let changelogContent = '';
    try {
      const content = fs.readFileSync(changelogPath.fsPath, 'utf8');
      changelogContent = content;
    } catch (error) {
      console.error('Failed to read changelog:', error);
      changelogContent = '# Changelog\n\nUnable to load changelog content.';
    }

    // Use a nonce to only allow specific scripts to be run

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline' vscode-resource: https:; script-src 'self' 'unsafe-inline' vscode-resource: https:; font-src 'self' vscode-resource: https:; img-src 'self' vscode-resource: https: data:; connect-src 'self' vscode-resource: https:;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="${styleUri}" rel="stylesheet">
        <title>What's New in DotCommand</title>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <span class="emoji">🚀</span>
            </div>
            <h1>What's New in DotCommand</h1>
            <p>Discover the latest features and improvements</p>
          </div>

          <div class="changelog-content" id="changelogContent">
            <!-- Changelog will be populated here -->
          </div>

          <div class="actions">
            <button class="btn primary" onclick="closePanel()">Got it!</button>
          </div>
        </div>

        <script src="${scriptUri}"></script>
        <script>
          // Pass changelog content to the script
          window.changelogContent = ${JSON.stringify(changelogContent)};
        </script>
      </body>
      </html>`;
  }
}
