import { ExtensionContext, window, commands, workspace, OpenDialogOptions } from 'vscode';
import { CommandStorage } from '../storage/storage';
import { getTerminalManager } from './terminalManager';
import { getCommandHistoryManager } from './commandHistory';
import { getPredefinedCategories as getPredefinedTemplateCategories } from './predefinedTemplates';

export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required?: boolean;
  type?: 'text' | 'dropdown' | 'file' | 'folder' | 'git-branch' | 'package';
  options?: string[]; // For dropdown type
  dynamicOptions?: 'git-branches' | 'workspace-files' | 'package-dependencies'; // For dynamic dropdowns
  validation?: {
    pattern?: string;
    message?: string;
    type?: 'string' | 'number' | 'email' | 'path' | 'url';
  };
}

export interface ContextTrigger {
  type: 'fileExists' | 'fileContains' | 'directoryExists';
  path: string;
  pattern?: string; // for fileContains type
  weight: number; // priority scoring (higher = more relevant)
}

export interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  template: string; // e.g., "git commit -m '{message}'"
  category: string;
  variables: TemplateVariable[];
  tags?: string[];
  contextTriggers?: ContextTrigger[]; // NEW: Smart context awareness
  createdAt: number;
  updatedAt: number;
  usageCount?: number;
  lastUsed?: number;
}

export interface TemplateCategory {
  name: string;
  description: string;
  icon?: string;
  templates: CommandTemplate[];
}

export interface SuggestedTemplate extends CommandTemplate {
  relevanceScore: number;
  matchedTriggers: ContextTrigger[];
}

/**
 * Context detector for smart template suggestions
 */
export class ContextDetector {
  private workspaceFiles: string[] = [];
  private fileContents: Map<string, string> = new Map();
  private lastScanTime: number = 0;
  private readonly SCAN_CACHE_DURATION = 30000; // 30 seconds

  /**
   * Scan workspace for context clues
   */
  async scanWorkspace(): Promise<void> {
    const now = Date.now();
    if (now - this.lastScanTime < this.SCAN_CACHE_DURATION) {
      return; // Use cached results
    }

    try {
      const workspaceFolders = workspace.workspaceFolders;
      if (!workspaceFolders) return;

      this.workspaceFiles = [];
      this.fileContents.clear();

      // Scan root directory files
      const rootFiles = await workspace.findFiles('**/*', '**/node_modules/**', 100);

      for (const fileUri of rootFiles) {
        const relativePath = workspace.asRelativePath(fileUri);
        this.workspaceFiles.push(relativePath);

        // Cache content for important files
        if (this.isImportantFile(relativePath)) {
          try {
            const content = await workspace.fs.readFile(fileUri);
            this.fileContents.set(relativePath, content.toString());
          } catch {
            // Ignore read errors
          }
        }
      }

      this.lastScanTime = now;
    } catch (error) {
      console.warn('Failed to scan workspace:', error);
    }
  }

  /**
   * Check if file exists in workspace
   */
  fileExists(path: string): boolean {
    return this.workspaceFiles.includes(path);
  }

  /**
   * Check if directory exists
   */
  directoryExists(path: string): boolean {
    return this.workspaceFiles.some(file => file.startsWith(path + '/'));
  }

  /**
   * Check if file contains pattern
   */
  fileContains(path: string, pattern: string): boolean {
    const content = this.fileContents.get(path);
    if (!content) return false;
    return content.includes(pattern);
  }

  /**
   * Determine if file is important for context detection
   */
  private isImportantFile(path: string): boolean {
    const importantFiles = [
      'package.json',
      'Dockerfile',
      'docker-compose.yml',
      'requirements.txt',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      '.git/config',
      'composer.json',
      'angular.json',
      'tsconfig.json'
    ];

    return importantFiles.includes(path) ||
           path.endsWith('.csproj') ||
           path.endsWith('.fsproj') ||
           path.includes('package-lock.json') ||
           path.includes('yarn.lock');
  }

  /**
   * Detect project technologies
   */
  detectTechnologies(): string[] {
    const technologies: string[] = [];

    if (this.fileExists('package.json')) {
      technologies.push('nodejs', 'npm');
      const packageJson = this.fileContents.get('package.json');
      if (packageJson) {
        if (packageJson.includes('"react"')) technologies.push('react');
        if (packageJson.includes('"vue"')) technologies.push('vue');
        if (packageJson.includes('"angular')) technologies.push('angular');
        if (packageJson.includes('"typescript"')) technologies.push('typescript');
      }
    }

    if (this.fileExists('Dockerfile') || this.fileExists('docker-compose.yml')) {
      technologies.push('docker');
    }

    if (this.fileExists('.git') || this.directoryExists('.git')) {
      technologies.push('git');
    }

    if (this.fileExists('requirements.txt') || this.fileExists('pyproject.toml')) {
      technologies.push('python');
    }

    if (this.fileExists('go.mod')) {
      technologies.push('go');
    }

    if (this.fileExists('Cargo.toml')) {
      technologies.push('rust');
    }

    if (this.fileExists('composer.json')) {
      technologies.push('php');
    }

    if (this.workspaceFiles.some(f => f.endsWith('.csproj') || f.endsWith('.fsproj'))) {
      technologies.push('dotnet');
    }

    return technologies;
  }

  /**
   * Invalidate cache to force immediate re-scan
   */
  invalidateCache(): void {
    this.lastScanTime = 0; // Reset scan time to force re-scan
  }
}

/**
 * Command template manager for dynamic command execution
 */
export class CommandTemplateManager {
  private static readonly STORAGE_KEY = 'dotcommand.templates';
  private context: ExtensionContext;
  private storage: CommandStorage;
  private contextDetector: ContextDetector;

  constructor(context: ExtensionContext, storage: CommandStorage) {
    this.context = context;
    this.storage = storage;
    this.contextDetector = new ContextDetector();
  }

  /**
   * Get all command templates
   */
  getAllTemplates(): CommandTemplate[] {
    return this.context.globalState.get<CommandTemplate[]>(CommandTemplateManager.STORAGE_KEY, []);
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): CommandTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Get template categories
   */
  getCategories(): string[] {
    const templates = this.getAllTemplates();
    const categories = templates.map(t => t.category);
    return [...new Set(categories)].sort();
  }

  /**
   * Get template by ID - Hybrid Lookup System
   * 1. Check User Templates (Stored) first - allows overrides/customization
   * 2. Check Predefined Templates (Hardcoded) - base functionality + instant updates
   */
  getTemplateById(id: string): CommandTemplate | undefined {
    // 1. Check User Templates (Stored) first - allows user overrides
    const userTemplate = this.getAllTemplates().find(template => template.id === id);
    if (userTemplate) return userTemplate;

    // 2. Check Predefined Templates (Hardcoded) - instant updates, no zombie templates
    const predefinedTemplates = this.getPredefinedCategories().flatMap(category => category.templates);
    return predefinedTemplates.find(template => template.id === id);
  }

  /**
   * Create a new command template
   */
  async createTemplate(templateData: Omit<CommandTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommandTemplate> {
    const template: CommandTemplate = {
      ...templateData,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const templates = this.getAllTemplates();
    templates.push(template);
    await this.saveTemplates(templates);

    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, updates: Partial<CommandTemplate>): Promise<boolean> {
    const templates = this.getAllTemplates();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) return false;

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: Date.now()
    };

    await this.saveTemplates(templates);
    return true;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const templates = this.getAllTemplates();
    const filtered = templates.filter(t => t.id !== id);

    if (filtered.length === templates.length) return false;

    await this.saveTemplates(filtered);
    return true;
  }

  /**
   * Execute a command template with user input
   */
  async executeTemplate(templateId: string): Promise<boolean> {
    const template = this.getTemplateById(templateId);
    if (!template) {
      window.showErrorMessage('Template not found');
      return false;
    }

    try {
      // Collect variable values from user
      const variableValues: { [key: string]: string } = {};

      for (const variable of template.variables) {
        const value = await this.promptForVariable(variable);
        if (value === undefined) return false; // User cancelled

        variableValues[variable.name] = value;
      }

      // Build the final command
      let finalCommand = template.template;
      for (const [varName, varValue] of Object.entries(variableValues)) {
        finalCommand = finalCommand.replace(new RegExp(`\\{${varName}\\}`, 'g'), varValue);
      }

      // Confirm execution
      const confirm = await window.showWarningMessage(
        `Execute: ${finalCommand}?`,
        { modal: true },
        'Yes, Run',
        'Cancel'
      );

      if (confirm !== 'Yes, Run') return false;

      // Execute the command
      const terminalManager = getTerminalManager();
      const terminal = terminalManager.getOrCreateTerminal(finalCommand, this.context);

      // Track execution
      terminalManager.trackCommand(terminal.name, finalCommand);
      await getCommandHistoryManager().trackCommand(finalCommand, 'template', terminal.name, template.category);

      // Update template usage
      await this.updateTemplate(templateId, {
        usageCount: (template.usageCount || 0) + 1,
        lastUsed: Date.now()
      });

      // Execute
      await commands.executeCommand('workbench.action.terminal.focus');
      terminal.show(true);

      setTimeout(() => {
        terminal.sendText(finalCommand);
        window.showInformationMessage(`Executed template: ${template.name}`);
      }, 500);

      return true;

    } catch (error) {
      console.error('Error executing template:', error);
      window.showErrorMessage(`Failed to execute template: ${error}`);
      return false;
    }
  }

  /**
   * Prompt user for a variable value
   */
  private async promptForVariable(variable: TemplateVariable): Promise<string | undefined> {
    const prompt = variable.description + (variable.defaultValue ? ` (${variable.defaultValue})` : '');
    const placeholder = variable.defaultValue || variable.name;

    // Handle dynamic variable types
    switch (variable.type) {
      case 'git-branch':
        return await this.promptForGitBranch(variable);

      case 'dropdown':
        return await this.promptForDropdown(variable);

      case 'file':
        return await this.promptForFile(variable);

      case 'folder':
        return await this.promptForFolder(variable);

      case 'package':
        return await this.promptForPackage(variable);

      default:
        // Handle text input with validation
        return await this.promptForTextInput(variable, prompt, placeholder);
    }
  }

  /**
   * Prompt for Git branch selection
   */
  private async promptForGitBranch(variable: TemplateVariable): Promise<string | undefined> {
    const { getGitBranchDetector } = await import('./gitBranchDetector');
    const branchDetector = getGitBranchDetector();

    // Check if it's a Git repository
    const isGitRepo = await branchDetector.isGitRepository();
    if (!isGitRepo) {
      // Fall back to text input
      return await this.promptForTextInput(variable, variable.description, variable.defaultValue || 'main');
    }

    // Get available branches
    const branches = await branchDetector.getBranches();
    const currentBranch = await branchDetector.getCurrentBranch();

    if (branches.length === 0) {
      // Fall back to text input
      return await this.promptForTextInput(variable, variable.description, currentBranch || variable.defaultValue || 'main');
    }

    // Show quick pick with branches
    const selected = await window.showQuickPick(
      branches.map(branch => ({
        label: branch,
        description: branch === currentBranch ? '(current)' : undefined
      })),
      {
        placeHolder: variable.description,
        matchOnDescription: true
      }
    );

    return selected?.label;
  }

  /**
   * Prompt for dropdown selection
   */
  private async promptForDropdown(variable: TemplateVariable): Promise<string | undefined> {
    let options: string[] = variable.options || [];
    let quickPickItems: { label: string; description?: string }[] = [];

    // Handle dynamic options
    if (variable.dynamicOptions) {
      switch (variable.dynamicOptions) {
        case 'git-branches': {
          const { getGitBranchDetector } = await import('./gitBranchDetector');
          const branchDetector = getGitBranchDetector();
          const branches = await branchDetector.getBranches();
          const currentBranch = await branchDetector.getCurrentBranch();

          quickPickItems = branches.map(branch => ({
            label: branch,
            description: branch === currentBranch ? '(current)' : undefined
          }));
          break;
        }

        case 'package-dependencies': {
          options = await this.getPackageDependencies();
          quickPickItems = options.map(option => ({ label: option }));
          break;
        }

        case 'workspace-files': {
          options = await this.getWorkspaceFiles();
          quickPickItems = options.map(option => ({ label: option }));
          break;
        }
      }
    } else {
      quickPickItems = options.map(option => ({ label: option }));
    }

    if (quickPickItems.length === 0) {
      // Fall back to text input
      return await this.promptForTextInput(variable, variable.description, variable.defaultValue || variable.name );
    }

    const selected = await window.showQuickPick(quickPickItems, {
      placeHolder: variable.description,
      matchOnDescription: true
    });

    return selected?.label;
  }

  /**
   * Unified helper for native file/folder picker
   */
  private async resolveFileSystemResource(type: 'file' | 'folder', title: string): Promise<string | undefined> {
    const workspaceFolder = workspace.workspaceFolders?.[0];

    const options: OpenDialogOptions = {
      canSelectFiles: type === 'file',
      canSelectFolders: type === 'folder',
      canSelectMany: false,
      openLabel: 'Select',
      title: title,
      defaultUri: workspaceFolder?.uri
    };

    const uris = await window.showOpenDialog(options);

    if (uris && uris.length > 0) {
      // Returns relative path if inside workspace, otherwise path as is
      return workspace.asRelativePath(uris[0]);
    }

    return undefined;
  }

  /**
   * Prompt for file selection using native picker
   */
  private async promptForFile(variable: TemplateVariable): Promise<string | undefined> {
    return this.resolveFileSystemResource('file', variable.description || 'Select File');
  }

  /**
   * Prompt for folder selection using native picker
   */
  private async promptForFolder(variable: TemplateVariable): Promise<string | undefined> {
    return this.resolveFileSystemResource('folder', variable.description || 'Select Folder');
  }

  /**
   * Prompt for package name
   */
  private async promptForPackage(variable: TemplateVariable): Promise<string | undefined> {
    const dependencies = await this.getPackageDependencies();

    if (dependencies.length === 0) {
      return await this.promptForTextInput(variable, variable.description, variable.defaultValue || variable.name );
    }

    const selected = await window.showQuickPick(
      dependencies.map(dep => ({ label: dep })),
      {
        placeHolder: variable.description || 'Select a package',
        matchOnDescription: true
      }
    );

    return selected?.label;
  }

  /**
   * Get package dependencies from package.json
   */
  private async getPackageDependencies(): Promise<string[]> {
    try {
      const workspaceFolder = workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return [];

      const packageJsonUri = workspace.findFiles('package.json', null, 1);
      const files = await packageJsonUri;

      if (files.length === 0) return [];

      const content = await workspace.fs.readFile(files[0]);
      const packageJson = JSON.parse(content.toString());

      const dependencies = [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {})
      ];

      return dependencies.sort();
    } catch (error) {
      console.warn('Error reading package.json:', error);
      return [];
    }
  }

  /**
   * Get workspace files
   */
  private async getWorkspaceFiles(): Promise<string[]> {
    try {
      const files = await workspace.findFiles('**/*', '**/node_modules/**', 100);
      return files.map(uri => workspace.asRelativePath(uri)).sort();
    } catch (error) {
      console.warn('Error getting workspace files:', error);
      return [];
    }
  }

  /**
   * Prompt for text input with validation
   */
  private async promptForTextInput(variable: TemplateVariable, prompt: string, placeholder: string): Promise<string | undefined> {
    return await window.showInputBox({
      prompt,
      placeHolder: placeholder,
      value: variable.defaultValue || '',
      validateInput: (input) => {
        if (variable.required && !input.trim()) {
          return 'This field is required';
        }
        if (variable.validation?.type === 'email' && input && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
          return 'Please enter a valid email address';
        }
        if (variable.validation?.type === 'url' && input && !/^https?:\/\/.+/.test(input)) {
          return 'Please enter a valid URL starting with http:// or https://';
        }
        if (variable.validation?.pattern && !new RegExp(variable.validation.pattern).test(input)) {
          return variable.validation.message || 'Invalid format';
        }
        return null;
      }
    });
  }

  /**
   * Get predefined template categories with sample templates
   */
  getPredefinedCategories(): TemplateCategory[] {
    return getPredefinedTemplateCategories();
  }

  /**
   * Search templates by name or description
   */
  searchTemplates(query: string): CommandTemplate[] {
    const templates = this.getAllTemplates();
    const lowerQuery = query.toLowerCase();

    return templates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.template.toLowerCase().includes(lowerQuery) ||
      (template.tags && template.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }

  /**
   * Get contextually suggested templates for the current workspace
   */
  async getSuggestedTemplates(limit: number = 10): Promise<SuggestedTemplate[]> {
    // Scan workspace for context
    await this.contextDetector.scanWorkspace();

    const allTemplates = [
      ...this.getAllTemplates(),
      ...this.getPredefinedCategories().flatMap(cat => cat.templates)
    ];

    const suggestedTemplates: SuggestedTemplate[] = [];

    for (const template of allTemplates) {
      if (!template.contextTriggers || template.contextTriggers.length === 0) {
        continue; // Skip templates without context triggers
      }

      const matchedTriggers: ContextTrigger[] = [];
      let totalScore = 0;

      for (const trigger of template.contextTriggers) {
        let triggerMatched = false;

        switch (trigger.type) {
          case 'fileExists':
            triggerMatched = this.contextDetector.fileExists(trigger.path);
            break;
          case 'directoryExists':
            triggerMatched = this.contextDetector.directoryExists(trigger.path);
            break;
          case 'fileContains':
            triggerMatched = this.contextDetector.fileContains(trigger.path, trigger.pattern || '');
            break;
        }

        if (triggerMatched) {
          matchedTriggers.push(trigger);
          totalScore += trigger.weight;
        }
      }

      if (matchedTriggers.length > 0) {
        suggestedTemplates.push({
          ...template,
          relevanceScore: totalScore,
          matchedTriggers
        });
      }
    }

    // Sort by relevance score (highest first) and return top results
    return suggestedTemplates
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Get detected technologies in the current workspace
   */
  async getDetectedTechnologies(): Promise<string[]> {
    await this.contextDetector.scanWorkspace();
    return this.contextDetector.detectTechnologies();
  }

  /**
   * Refresh context by invalidating cache - forces immediate re-scan
   */
  refreshContext(): void {
    this.contextDetector.invalidateCache();
  }

  /**
   * Generate unique ID for template
   */
  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save templates to storage
   */
  private async saveTemplates(templates: CommandTemplate[]): Promise<void> {
    await this.context.globalState.update(CommandTemplateManager.STORAGE_KEY, templates);
  }
}

// Global instance
let templateManager: CommandTemplateManager | undefined;

/**
 * Initialize template manager
 */
export function initializeTemplateManager(context: ExtensionContext, storage: CommandStorage): void {
  templateManager = new CommandTemplateManager(context, storage);
}

/**
 * Get template manager instance
 */
export function getTemplateManager(): CommandTemplateManager {
  if (!templateManager) {
    throw new Error('TemplateManager not initialized');
  }
  return templateManager;
}