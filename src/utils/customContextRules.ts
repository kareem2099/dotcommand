import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom Context Rule Types
 */
export type RuleType = 'file_pattern' | 'directory' | 'dependency' | 'custom';

export type RuleCondition = 'exists' | 'not_exists' | 'contains' | 'matches_regex';

/**
 * Custom Context Rule Interface
 */
export interface CustomContextRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: RuleType;
  condition: RuleCondition;
  value: string; // The pattern/directory/dependency to match
  weight: number; // How much this rule affects relevance (0-100)
  suggestions: string[]; // Template IDs or commands to suggest
  createdAt: number;
  updatedAt: number;
}

/**
 * Custom Rules Configuration
 */
export interface CustomRulesConfig {
  rules: CustomContextRule[];
  lastModified: number;
}

/**
 * Rule Evaluation Result
 */
export interface RuleEvaluationResult {
  rule: CustomContextRule;
  matched: boolean;
  score: number;
}

/**
 * CustomContextRules - Manages user-defined context triggers
 * 
 * Allows users to define custom rules that trigger specific templates/commands
 * based on file patterns, directories, dependencies, or custom logic
 */
export class CustomContextRules {
  private static instance: CustomContextRules;
  private context: vscode.ExtensionContext;
  private readonly STORAGE_KEY = 'dotcommand.customContextRules';
  
  private rules: CustomContextRule[] = [];
  private cache: Map<string, boolean | number> = new Map();
  private cacheTimeout: number = 60000; // 1 minute

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadRules();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(context?: vscode.ExtensionContext): CustomContextRules {
    if (!CustomContextRules.instance) {
      if (!context) {
        throw new Error('CustomContextRules requires context on first initialization');
      }
      CustomContextRules.instance = new CustomContextRules(context);
    }
    return CustomContextRules.instance;
  }

  /**
   * Initialize with context (for use in extension.ts)
   */
  public static initialize(context: vscode.ExtensionContext): CustomContextRules {
    CustomContextRules.instance = new CustomContextRules(context);
    return CustomContextRules.instance;
  }

  // ==================== RULE MANAGEMENT ====================

  /**
   * Load rules from storage
   */
  private loadRules(): void {
    const config = this.context.globalState.get<CustomRulesConfig>(this.STORAGE_KEY);
    if (config && config.rules) {
      this.rules = config.rules;
    }
  }

  /**
   * Save rules to storage
   */
  private saveRules(): void {
    const config: CustomRulesConfig = {
      rules: this.rules,
      lastModified: Date.now()
    };
    this.context.globalState.update(this.STORAGE_KEY, config);
    this.clearCache();
  }

  /**
   * Get all rules
   */
  public getAllRules(): CustomContextRule[] {
    return [...this.rules];
  }

  /**
   * Get enabled rules only
   */
  public getEnabledRules(): CustomContextRule[] {
    return this.rules.filter(rule => rule.enabled);
  }

  /**
   * Get rule by ID
   */
  public getRuleById(id: string): CustomContextRule | undefined {
    return this.rules.find(rule => rule.id === id);
  }

  /**
   * Add a new rule
   */
  public addRule(rule: Omit<CustomContextRule, 'id' | 'createdAt' | 'updatedAt'>): CustomContextRule {
    const now = Date.now();
    const newRule: CustomContextRule = {
      ...rule,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    };

    this.rules.push(newRule);
    this.saveRules();
    return newRule;
  }

  /**
   * Update an existing rule
   */
  public updateRule(id: string, updates: Partial<Omit<CustomContextRule, 'id' | 'createdAt'>>): CustomContextRule | null {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index === -1) {
      return null;
    }

    this.rules[index] = {
      ...this.rules[index],
      ...updates,
      updatedAt: Date.now()
    };

    this.saveRules();
    return this.rules[index];
  }

  /**
   * Delete a rule
   */
  public deleteRule(id: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index === -1) {
      return false;
    }

    this.rules.splice(index, 1);
    this.saveRules();
    return true;
  }

  /**
   * Toggle rule enabled state
   */
  public toggleRule(id: string): CustomContextRule | null {
    const rule = this.getRuleById(id);
    if (!rule) return null;
    
    return this.updateRule(id, { enabled: !rule.enabled });
  }

  // ==================== RULE EVALUATION ====================

  /**
   * Evaluate all enabled rules and return matching suggestions
   */
  public async evaluateRules(): Promise<RuleEvaluationResult[]> {
    const enabledRules = this.getEnabledRules();
    const results: RuleEvaluationResult[] = [];

    for (const rule of enabledRules) {
      const matched = await this.evaluateRule(rule);
      results.push({
        rule,
        matched,
        score: matched ? rule.weight : 0
      });
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Evaluate a single rule
   */
  public async evaluateRule(rule: CustomContextRule): Promise<boolean> {
    try {
      switch (rule.type) {
        case 'file_pattern':
          return this.evaluateFilePattern(rule);
        case 'directory':
          return this.evaluateDirectory(rule);
        case 'dependency':
          return this.evaluateDependency(rule);
        case 'custom':
          return this.evaluateCustom(rule);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      return false;
    }
  }

  /**
   * Evaluate file pattern rule
   */
  private async evaluateFilePattern(rule: CustomContextRule): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return false;
    }

    // Check cache first
    const cacheKey = `file:${rule.value}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached !== undefined) return cached;

    const pattern = rule.value;
    const isRegex = pattern.startsWith('/') && pattern.endsWith('/');
    
    for (const folder of workspaceFolders) {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, isRegex ? pattern.slice(1, -1) : pattern),
        '**/node_modules/**',
        1 // Limit to 1 file for performance
      );

      const matched = files.length > 0;
      if (matched) {
        this.setCachedResult(cacheKey, true);
        return true;
      }
    }

    this.setCachedResult(cacheKey, false);
    return false;
  }

  /**
   * Evaluate directory rule
   */
  private async evaluateDirectory(rule: CustomContextRule): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return false;
    }

    // Check cache first
    const cacheKey = `dir:${rule.value}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached !== undefined) return cached;

    const dirPath = rule.value;
    
    for (const folder of workspaceFolders) {
      const fullPath = path.join(folder.uri.fsPath, dirPath);
      const exists = fs.existsSync(fullPath);
      
      if (exists) {
        this.setCachedResult(cacheKey, true);
        return true;
      }
    }

    this.setCachedResult(cacheKey, false);
    return false;
  }

  /**
   * Evaluate dependency rule
   */
  private async evaluateDependency(rule: CustomContextRule): Promise<boolean> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return false;
    }

    // Check cache first
    const cacheKey = `dep:${rule.value}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached !== undefined) return cached;

    const packageName = rule.value;
    
    for (const folder of workspaceFolders) {
      const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        try {
          const content = fs.readFileSync(packageJsonPath, 'utf8');
          const pkg = JSON.parse(content);
          
          const hasDependency = 
            (pkg.dependencies && pkg.dependencies[packageName]) ||
            (pkg.devDependencies && pkg.devDependencies[packageName]);
          
          if (hasDependency) {
            this.setCachedResult(cacheKey, true);
            return true;
          }
        } catch (error) {
          console.warn('Error reading package.json for dependency check:', error);
        }
      }
    }

    this.setCachedResult(cacheKey, false);
    return false;
  }

  /**
   * Evaluate custom rule (placeholder for advanced logic)
   */
  private async evaluateCustom(rule: CustomContextRule): Promise<boolean> {
    // Custom rules can be extended with more complex logic
    // For now, return false as they need custom implementation
    console.warn('Custom rule type not fully implemented:', rule.id);
    return false;
  }

  // ==================== CACHING ====================

  /**
   * Get cached result
   */
  private getCachedResult(key: string): boolean | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;
    
    const timestamp = this.cache.get(`${key}_time`) as number | undefined;
    if (!timestamp) return undefined;

    if (Date.now() - timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      this.cache.delete(`${key}_time`);
      return undefined;
    }

    return cached as boolean;
  }

  /**
   * Set cached result
   */
  private setCachedResult(key: string, result: boolean): void {
    this.cache.set(key, result);
    this.cache.set(`${key}_time`, Date.now());
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  // ==================== SUGGESTIONS ====================

  /**
   * Get suggested template/command IDs based on matched rules
   */
  public async getSuggestions(): Promise<string[]> {
    const results = await this.evaluateRules();
    const suggestions: string[] = [];

    for (const result of results) {
      if (result.matched && result.rule.suggestions) {
        suggestions.push(...result.rule.suggestions);
      }
    }

    // Remove duplicates
    return [...new Set(suggestions)];
  }

  /**
   * Get total relevance score from matched rules
   */
  public async getRelevanceScore(): Promise<number> {
    const results = await this.evaluateRules();
    return results.reduce((total, result) => total + result.score, 0);
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Export rules to JSON
   */
  public exportRules(): string {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      rules: this.rules
    }, null, 2);
  }

  /**
   * Import rules from JSON
   */
  public importRules(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json);
      if (!data.rules || !Array.isArray(data.rules)) {
        errors.push('Invalid format: missing rules array');
        return { imported, errors };
      }

      for (const rule of data.rules) {
        try {
          // Validate required fields
          if (!rule.name || !rule.type || !rule.condition || !rule.value) {
            errors.push(`Rule "${rule.name || 'unnamed'}" missing required fields`);
            continue;
          }

          // Add rule without duplicate ID
          this.addRule({
            name: rule.name,
            description: rule.description,
            enabled: rule.enabled ?? true,
            type: rule.type,
            condition: rule.condition,
            value: rule.value,
            weight: rule.weight ?? 50,
            suggestions: rule.suggestions || []
          });
          imported++;
        } catch (error) {
          errors.push(`Error importing rule: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Invalid JSON: ${error}`);
    }

    return { imported, errors };
  }

  // ==================== UTILITIES ====================

  /**
   * Generate unique ID for rules
   */
  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate rule
   */
  public validateRule(rule: Partial<CustomContextRule>): string[] {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    if (!rule.type || !['file_pattern', 'directory', 'dependency', 'custom'].includes(rule.type)) {
      errors.push('Invalid rule type');
    }

    if (!rule.condition || !['exists', 'not_exists', 'contains', 'matches_regex'].includes(rule.condition)) {
      errors.push('Invalid rule condition');
    }

    if (!rule.value || rule.value.trim().length === 0) {
      errors.push('Rule value is required');
    }

    if (rule.weight !== undefined && (rule.weight < 0 || rule.weight > 100)) {
      errors.push('Weight must be between 0 and 100');
    }

    return errors;
  }

  /**
   * Get sample rules for new users
   */
  public getSampleRules(): Omit<CustomContextRule, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        name: 'React Project',
        description: 'Suggest React commands when React is in dependencies',
        enabled: false,
        type: 'dependency',
        condition: 'exists',
        value: 'react',
        weight: 50,
        suggestions: ['react-start', 'react-build']
      },
      {
        name: 'Vue Project',
        description: 'Suggest Vue commands when Vue is in dependencies',
        enabled: false,
        type: 'dependency',
        condition: 'exists',
        value: 'vue',
        weight: 50,
        suggestions: ['vue-serve', 'vue-build']
      },
      {
        name: 'TypeScript Project',
        description: 'Suggest TypeScript commands when TypeScript is available',
        enabled: false,
        type: 'dependency',
        condition: 'exists',
        value: 'typescript',
        weight: 40,
        suggestions: ['tsc-compile', 'tsc-watch']
      },
      {
        name: 'Has Tests',
        description: 'Suggest test commands when test directory exists',
        enabled: false,
        type: 'directory',
        condition: 'exists',
        value: '__tests__',
        weight: 30,
        suggestions: ['test-run', 'test-watch']
      },
      {
        name: 'Has Docker',
        description: 'Suggest Docker commands when Dockerfile exists',
        enabled: false,
        type: 'file_pattern',
        condition: 'exists',
        value: 'Dockerfile',
        weight: 60,
        suggestions: ['docker-build', 'docker-run']
      }
    ];
  }
}

/**
 * Initialize custom context rules
 */
export function initializeCustomContextRules(context: vscode.ExtensionContext): CustomContextRules {
  return CustomContextRules.initialize(context);
}

/**
 * Get custom context rules instance
 */
export function getCustomContextRules(): CustomContextRules {
  return CustomContextRules.getInstance();
}
