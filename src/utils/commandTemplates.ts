import { ExtensionContext, window, commands } from 'vscode';
import { CommandStorage } from '../storage/storage';
import { getTerminalManager } from './terminalManager';
import { getCommandHistoryManager } from './commandHistory';

export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required?: boolean;
  validation?: {
    pattern?: string;
    message?: string;
    type?: 'string' | 'number' | 'email' | 'path' | 'url';
  };
}

export interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  template: string; // e.g., "git commit -m '{message}'"
  category: string;
  variables: TemplateVariable[];
  tags?: string[];
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

/**
 * Command template manager for dynamic command execution
 */
export class CommandTemplateManager {
  private static readonly STORAGE_KEY = 'dotcommand.templates';
  private context: ExtensionContext;
  private storage: CommandStorage;

  constructor(context: ExtensionContext, storage: CommandStorage) {
    this.context = context;
    this.storage = storage;
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
   * Get template by ID
   */
  getTemplateById(id: string): CommandTemplate | undefined {
    return this.getAllTemplates().find(template => template.id === id);
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

    let value: string | undefined;

    // Handle different validation types
    if (variable.validation?.type === 'number') {
      // For numbers, we could add special handling, but for now use text input
      value = await window.showInputBox({
        prompt,
        placeHolder: placeholder,
        value: variable.defaultValue,
        validateInput: (input) => {
          if (variable.required && !input.trim()) {
            return 'This field is required';
          }
          if (variable.validation?.pattern && !new RegExp(variable.validation.pattern).test(input)) {
            return variable.validation.message || 'Invalid format';
          }
          return null;
        }
      });
    } else {
      value = await window.showInputBox({
        prompt,
        placeHolder: placeholder,
        value: variable.defaultValue,
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

    return value;
  }

  /**
   * Get predefined template categories with sample templates
   */
  getPredefinedCategories(): TemplateCategory[] {
    return [
      {
        name: 'Git',
        description: 'Version control operations',
        icon: 'git-branch',
        templates: [
          {
            id: 'git-commit',
            name: 'Commit with Message',
            description: 'Commit staged changes with a custom message',
            template: 'git commit -m "{message}"',
            category: 'Git',
            variables: [
              {
                name: 'message',
                description: 'Commit message',
                defaultValue: 'updates',
                required: true
              }
            ],
            tags: ['commit', 'version-control'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          {
            id: 'git-branch-create',
            name: 'Create Branch',
            description: 'Create and switch to a new branch',
            template: 'git checkout -b {branch_name}',
            category: 'Git',
            variables: [
              {
                name: 'branch_name',
                description: 'Branch name (e.g., feature/new-feature)',
                defaultValue: 'feature/new-feature',
                required: true,
                validation: {
                  pattern: '^[a-zA-Z0-9-_/]+$',
                  message: 'Branch name can only contain letters, numbers, hyphens, underscores, and slashes'
                }
              }
            ],
            tags: ['branch', 'create'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          {
            id: 'git-push-branch',
            name: 'Push Branch',
            description: 'Push commits to a specific remote branch',
            template: 'git push origin {branch}',
            category: 'Git',
            variables: [
              {
                name: 'branch',
                description: 'Branch name to push',
                defaultValue: 'main',
                required: true
              }
            ],
            tags: ['push', 'remote'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ]
      },
      {
        name: 'Docker',
        description: 'Container operations',
        icon: 'docker',
        templates: [
          {
            id: 'docker-build',
            name: 'Build Image',
            description: 'Build a Docker image with custom name',
            template: 'docker build -t {image_name} .',
            category: 'Docker',
            variables: [
              {
                name: 'image_name',
                description: 'Image name and tag (e.g., myapp:latest)',
                defaultValue: 'myapp:latest',
                required: true,
                validation: {
                  pattern: '^[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$',
                  message: 'Image name should be in format: name:tag'
                }
              }
            ],
            tags: ['build', 'image'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          {
            id: 'docker-run-port',
            name: 'Run with Port',
            description: 'Run container with port mapping',
            template: 'docker run -d -p {host_port}:{container_port} {image}',
            category: 'Docker',
            variables: [
              {
                name: 'host_port',
                description: 'Host port number',
                defaultValue: '3000',
                required: true,
                validation: {
                  type: 'number',
                  pattern: '^[0-9]+$',
                  message: 'Port must be a number'
                }
              },
              {
                name: 'container_port',
                description: 'Container port number',
                defaultValue: '3000',
                required: true,
                validation: {
                  type: 'number',
                  pattern: '^[0-9]+$',
                  message: 'Port must be a number'
                }
              },
              {
                name: 'image',
                description: 'Docker image name',
                defaultValue: 'myapp:latest',
                required: true
              }
            ],
            tags: ['run', 'port', 'container'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ]
      },
      {
        name: 'NPM',
        description: 'Node.js package management',
        icon: 'npm',
        templates: [
          {
            id: 'npm-install-package',
            name: 'Install Package',
            description: 'Install a specific NPM package',
            template: 'npm install {package_name}',
            category: 'NPM',
            variables: [
              {
                name: 'package_name',
                description: 'Package name (e.g., lodash, react)',
                defaultValue: 'lodash',
                required: true
              }
            ],
            tags: ['install', 'package'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          {
            id: 'npm-run-script',
            name: 'Run Script',
            description: 'Execute a custom npm script',
            template: 'npm run {script_name}',
            category: 'NPM',
            variables: [
              {
                name: 'script_name',
                description: 'Script name from package.json',
                defaultValue: 'dev',
                required: true
              }
            ],
            tags: ['script', 'run'],
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ]
      }
    ];
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
