import * as vscode from 'vscode';
import { getTemplateManager } from '../utils/commandTemplates';

interface SuggestionQuickPickItem extends vscode.QuickPickItem {
    templateId: string;
}

export class SuggestionQuickAccess {
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext) {
        // Create Status Bar Item specifically for suggestions
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            97 // Priority
        );
        this.statusBarItem.command = 'dotcommand.quickRun';
        this.disposables.push(this.statusBarItem);
        context.subscriptions.push(this.statusBarItem);

        // Initial check
        this.updateStatusBar();
    }

    /**
     * Updates the status bar based on current context
     */
    public async updateStatusBar() {
        try {
            const templateManager = getTemplateManager();
            if (!templateManager) return;

            const suggestions = await templateManager.getSuggestedTemplates(1);

            if (suggestions.length > 0) {
                const topSuggestion = suggestions[0];
                this.statusBarItem.text = `$(zap) ${topSuggestion.name}`;
                this.statusBarItem.tooltip = `Suggested: ${topSuggestion.description}\nRelevance: ${topSuggestion.relevanceScore}`;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                this.statusBarItem.show();
            } else {
                this.statusBarItem.hide();
            }
        } catch (error) {
            console.error('Error updating suggestion status bar:', error);
            this.statusBarItem.hide();
        }
    }

    /**
     * Shows a Quick Pick with all suggested commands
     */
    public async showQuickPick() {
        try {
            const templateManager = getTemplateManager();
            const suggestions = await templateManager.getSuggestedTemplates(10);

            if (suggestions.length === 0) {
                vscode.window.showInformationMessage('No smart suggestions available for this context.');
                return;
            }

            // Map suggestions to QuickPickItems
            const items: SuggestionQuickPickItem[] = suggestions.map(t => ({
                label: `$(zap) ${t.name}`,
                description: t.description,
                detail: `Relevance: ${t.relevanceScore} • Category: ${t.category}`,
                templateId: t.id
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: '⚡ Smart Suggestions for this Project',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                await templateManager.executeTemplate(selected.templateId);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show suggestions: ${error}`);
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
        this.statusBarItem.dispose();
    }
}
