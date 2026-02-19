import { WebviewPanel, window, ViewColumn, ExtensionContext, Uri } from 'vscode';
import { getTemplateManager } from '../utils/commandTemplates';
import { getWebviewDevScript } from '../utils/logger';

export class TemplateManagerWebview {
    private static instance: TemplateManagerWebview;
    private panel: WebviewPanel | undefined;
    private context: ExtensionContext;

    private constructor(context: ExtensionContext) {
        this.context = context;
    }

    public static getInstance(context?: ExtensionContext): TemplateManagerWebview {
        if (!TemplateManagerWebview.instance) {
            if (!context) {
                throw new Error('Context required for first TemplateManagerWebview instance');
            }
            TemplateManagerWebview.instance = new TemplateManagerWebview(context);
        }
        return TemplateManagerWebview.instance;
    }

    public show(): void {
        if (this.panel) {
            this.panel.reveal(ViewColumn.One);
            return;
        }

        this.panel = window.createWebviewPanel(
            'dotcommand.templateManager',
            'Template Manager',
            ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    Uri.joinPath(this.context.extensionUri, 'resources')
                ]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.setupMessageHandlers();

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private getWebviewContent(): string {
        const webview = this.panel!.webview;

        // Get URIs for resources
        const stylesUri = webview.asWebviewUri(
            Uri.joinPath(this.context.extensionUri, 'resources', 'styles', 'styles.css')
        );
        const customStylesUri = webview.asWebviewUri(
            Uri.joinPath(this.context.extensionUri, 'resources', 'webviews', 'templatemanager', 'styles.css')
        );
        const scriptUri = webview.asWebviewUri(
            Uri.joinPath(this.context.extensionUri, 'resources', 'webviews', 'templatemanager', 'script.js')
        );

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                ${getWebviewDevScript(nonce)}
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>DotCommand - Template Manager</title>
                <link rel="stylesheet" href="${stylesUri}">
                <link rel="stylesheet" href="${customStylesUri}">
            </head>
            <body>
                <div class="template-manager">
                    <div class="header">
                        <h1>📋 Template Manager</h1>
                        <div class="actions">
                            <button class="btn" id="refreshBtn">🔄 Refresh</button>
                            <button class="btn primary" id="createBtn">➕ Create Template</button>
                        </div>
                    </div>

                    <div class="stats">
                        <div class="stat-item">
                            <span class="stat-value" id="totalTemplates">0</span>
                            <span class="stat-label">Total Templates</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="userTemplates">0</span>
                            <span class="stat-label">My Templates</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="predefinedTemplates">0</span>
                            <span class="stat-label">Predefined</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="totalUsage">0</span>
                            <span class="stat-label">Total Usage</span>
                        </div>
                    </div>

                    <!-- Suggested Templates Section -->
                    <div class="suggested-section" id="suggestedSection" style="display: none;">
                        <div class="suggested-header">
                            <h2>⚡ Suggested for this Project</h2>
                            <span class="suggested-subtitle">Contextually relevant commands based on your project files</span>
                        </div>
                        <div class="suggested-templates" id="suggestedTemplates">
                            <!-- Suggested templates will be populated by JavaScript -->
                        </div>
                    </div>

                    <div class="search-container">
                        <input type="text" class="search-input" id="searchInput" placeholder="Search templates...">
                    </div>

                    <div class="categories" id="categories">
                        <!-- Categories will be populated by JavaScript -->
                    </div>

                    <div id="templatesContainer">
                        <!-- Templates will be populated by JavaScript -->
                    </div>
                </div>

                <!-- Create/Edit Template Modal -->
                <div class="modal" id="templateModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 class="modal-title" id="modalTitle">Create Template</h2>
                            <button class="modal-close" id="modalClose">&times;</button>
                        </div>

                        <form id="templateForm">
                            <div class="form-group">
                                <label class="form-label" for="templateName">Template Name *</label>
                                <input type="text" class="form-input" id="templateName" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="templateDescription">Description *</label>
                                <textarea class="form-input form-textarea" id="templateDescription" required></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="templateCommand">Command Template *</label>
                                <textarea class="form-input form-textarea" id="templateCommand"
                                    placeholder="Use {variable_name} for dynamic values" required></textarea>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="templateCategory">Category</label>
                                <input type="text" class="form-input" id="templateCategory" placeholder="e.g., Git, Docker, Custom">
                            </div>

                            <div class="form-group">
                                <label class="form-label">Variables</label>
                                <div class="variables-list" id="variablesList">
                                    <!-- Variables will be populated here -->
                                </div>
                                <button type="button" class="btn add-variable" id="addVariableBtn">➕ Add Variable</button>
                            </div>

                            <div class="form-group">
                                <button type="submit" class="btn primary" id="saveTemplateBtn">Save Template</button>
                                <button type="button" class="btn" id="cancelBtn">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Variable Modal -->
                <div class="modal" id="variableModal" style="z-index: 2000;">
                    <div class="modal-content small-modal">
                        <div class="modal-header">
                            <h2 class="modal-title" id="variableModalTitle">Add Variable</h2>
                            <button type="button" class="modal-close" id="variableModalClose">&times;</button>
                        </div>

                        <form id="variableForm">
                            <div class="form-group">
                                <label class="form-label" for="variableName">Variable Name *</label>
                                <input type="text" class="form-input" id="variableName" placeholder="e.g., branch_name" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="variableDesc">Description</label>
                                <input type="text" class="form-input" id="variableDesc" placeholder="What is this for?">
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="variableType">Input Type</label>
                                <select class="form-input form-select" id="variableType">
                                    <option value="text">Text Input (Default)</option>
                                    <option value="git-branch">🌿 Git Branch List</option>
                                    <option value="package">📦 NPM Package List</option>
                                    <option value="file">📄 File Picker</option>
                                    <option value="folder">📂 Folder Picker</option>
                                    <option value="dropdown">list Custom Dropdown</option>
                                </select>
                            </div>

                            <div class="form-group" id="dropdownOptionsGroup" style="display: none;">
                                <label class="form-label" for="variableOptions">Options (comma separated)</label>
                                <input type="text" class="form-input" id="variableOptions" placeholder="dev, prod, staging">
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="variableDefault">Default Value</label>
                                <input type="text" class="form-input" id="variableDefault">
                            </div>

                            <div class="form-group actions-row">
                                <button type="button" class="btn primary" id="saveVariableBtn">Add</button>
                                <button type="button" class="btn" id="cancelVariableBtn">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private setupMessageHandlers(): void {
        if (!this.panel) return;

        this.panel.webview.onDidReceiveMessage(async (message) => {
            try {
                const templateManager = getTemplateManager();

                switch (message.type) {
                    case 'loadTemplates': {
                        const userTemplates = templateManager.getAllTemplates();
                        const predefinedCategories = templateManager.getPredefinedCategories();

                        // Combine all templates
                        const allTemplates = [
                            ...userTemplates,
                            ...predefinedCategories.flatMap(cat => cat.templates)
                        ];

                        this.panel!.webview.postMessage({
                            type: 'templatesLoaded',
                            templates: allTemplates,
                            userTemplates: userTemplates,
                            predefinedCategories: predefinedCategories
                        });
                        break;
                    }

                    case 'loadSuggestedTemplates': {
                        const suggestedTemplates = await templateManager.getSuggestedTemplates(6); // Top 6 suggestions
                        this.panel!.webview.postMessage({
                            type: 'suggestedTemplatesLoaded',
                            suggestedTemplates: suggestedTemplates
                        });
                        break;
                    }

                    case 'saveTemplate': {
                        const template = await templateManager.createTemplate(message.template);
                        this.panel!.webview.postMessage({
                            type: 'templateSaved',
                            template: template
                        });
                        break;
                    }

                    case 'deleteTemplate': {
                        const deleted = await templateManager.deleteTemplate(message.templateId);
                        if (deleted) {
                            this.panel!.webview.postMessage({
                                type: 'templateDeleted',
                                templateId: message.templateId
                            });
                        } else {
                            this.panel!.webview.postMessage({
                                type: 'error',
                                message: 'Template not found'
                            });
                        }
                        break;
                    }

                    case 'confirmDelete': {
                        const result = await window.showWarningMessage(
                            'Are you sure you want to delete this template?',
                            { modal: true },
                            'Delete',
                            'Cancel'
                        );

                        if (result === 'Delete') {
                            const deleted = await templateManager.deleteTemplate(message.templateId);
                            if (deleted) {
                                this.panel!.webview.postMessage({
                                    type: 'templateDeleted',
                                    templateId: message.templateId
                                });
                            } else {
                                this.panel!.webview.postMessage({
                                    type: 'error',
                                    message: 'Template not found'
                                });
                            }
                        }
                        break;
                    }

                    case 'executeTemplate': {
                        await templateManager.executeTemplate(message.templateId);
                        break;
                    }

                    case 'showInfo': {
                        window.showInformationMessage(message.message);
                        break;
                    }

                    case 'showError': {
                        window.showErrorMessage(message.message);
                        break;
                    }
                }
            } catch (error) {
                console.error('Error handling webview message:', error);
                this.panel!.webview.postMessage({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error occurred'
                });
            }
        });
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
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
