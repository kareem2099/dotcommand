import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PackageJsonInfo {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  path: string;
}

export interface PackageSuggestion {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'script';
  command?: string;
  description?: string;
}

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'dependency' | 'devDependency';
}

/**
 * Popular packages database for smart suggestions
 */
const POPULAR_PACKAGES = {
  // Testing
  'jest': { category: 'testing', description: 'JavaScript testing framework' },
  'vitest': { category: 'testing', description: 'Fast unit test framework' },
  'playwright': { category: 'testing', description: 'E2E testing framework' },
  'mocha': { category: 'testing', description: 'JavaScript test framework' },
  'cypress': { category: 'testing', description: 'E2E testing framework' },
  
  // Linting & Formatting
  'eslint': { category: 'linting', description: 'JavaScript/TypeScript linter' },
  'prettier': { category: 'formatting', description: 'Code formatter' },
  'stylelint': { category: 'linting', description: 'CSS/SCSS linter' },
  
  // TypeScript
  'typescript': { category: 'typescript', description: 'TypeScript compiler' },
  '@types/node': { category: 'typescript', description: 'Node.js type definitions' },
  'ts-node': { category: 'typescript', description: 'TypeScript execution engine' },
  
  // Build Tools
  'vite': { category: 'build', description: 'Fast build tool and dev server' },
  'webpack': { category: 'build', description: 'Module bundler' },
  'rollup': { category: 'build', description: 'JavaScript module bundler' },
  'esbuild': { category: 'build', description: 'Fast JavaScript bundler' },
  'parcel': { category: 'build', description: 'Zero-config bundler' },
  
  // Frameworks
  'react': { category: 'framework', description: 'React library' },
  'react-dom': { category: 'framework', description: 'React DOM library' },
  '@types/react': { category: 'typescript', description: 'TypeScript definitions for React' },
  'vue': { category: 'framework', description: 'Vue framework' },
  '@vue/compiler-sfc': { category: 'framework', description: 'Vue single-file compiler' },
  'next': { category: 'framework', description: 'Next.js framework' },
  'angular': { category: 'framework', description: 'Angular framework' },
  'svelte': { category: 'framework', description: 'Svelte framework' },
  
  // State Management
  'redux': { category: 'state', description: 'Predictable state container' },
  'zustand': { category: 'state', description: 'Small, fast state management' },
  'mobx': { category: 'state', description: 'State management library' },
  'pinia': { category: 'state', description: 'Vue state management' },
  'vuex': { category: 'state', description: 'Vue state management' },
  
  // API & HTTP
  'axios': { category: 'http', description: 'HTTP client' },
  'fetch': { category: 'http', description: 'Native fetch API' },
  'graphql': { category: 'api', description: 'GraphQL' },
  '@apollo/client': { category: 'api', description: 'GraphQL client' },
  
  // CSS & UI
  'tailwindcss': { category: 'css', description: 'Utility-first CSS framework' },
  'styled-components': { category: 'css', description: 'CSS-in-JS library' },
  'emotion': { category: 'css', description: 'CSS-in-JS library' },
  'sass': { category: 'css', description: 'CSS preprocessor' },
  'less': { category: 'css', description: 'CSS preprocessor' },
  
  // Utilities
  'lodash': { category: 'utilities', description: 'JavaScript utility library' },
  'moment': { category: 'utilities', description: 'Date manipulation library' },
  'date-fns': { category: 'utilities', description: 'Date utility library' },
  'uuid': { category: 'utilities', description: 'UUID generation' },
  'dotenv': { category: 'utilities', description: 'Environment variable loader' }
};

/**
 * PackageJsonParser - Parses package.json to extract dependencies and scripts
 * 
 * Provides suggestions for npm/yarn/pnpm commands based on existing packages
 */
export class PackageJsonParser {
  private static instance: PackageJsonParser;
  private cache: Map<string, PackageJsonInfo> = new Map();
  private cacheTimeout: number = 30000; // 30 seconds
  private cacheTimestamp: Map<string, number> = new Map();
  
  // File watcher for live updates
  private watcher?: vscode.FileSystemWatcher;
  
  // Detected package manager
  private detectedPackageManager?: PackageManager;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PackageJsonParser {
    if (!PackageJsonParser.instance) {
      PackageJsonParser.instance = new PackageJsonParser();
    }
    return PackageJsonParser.instance;
  }

  /**
   * Start watching for package.json changes
   */
  public startWatching(context: vscode.ExtensionContext): void {
    if (this.watcher) {
      return; // Already watching
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    // Watch root package.json
    const pattern = new vscode.RelativePattern(
      workspaceFolders[0],
      'package.json'
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    this.watcher.onDidChange(() => {
      console.log('package.json changed, clearing cache');
      this.clearCache();
      this.detectedPackageManager = undefined; // Re-detect
    });
    
    this.watcher.onDidCreate(() => {
      console.log('package.json created');
      this.clearCache();
      this.detectedPackageManager = undefined;
    });

    // Add to disposables
    context.subscriptions.push(this.watcher);
  }

  /**
   * Stop watching
   */
  public dispose(): void {
    this.watcher?.dispose();
    this.watcher = undefined;
  }

  /**
   * Find package.json in workspace
   */
  public async findPackageJson(): Promise<string | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }

    for (const folder of workspaceFolders) {
      const packageJsonPath = path.join(folder.uri.fsPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return packageJsonPath;
      }
    }

    return null;
  }

  /**
   * Get package.json info with caching
   */
  public async getPackageJson(forceRefresh: boolean = false): Promise<PackageJsonInfo | null> {
    const packageJsonPath = await this.findPackageJson();
    if (!packageJsonPath) {
      return null;
    }

    // Check cache
    if (!forceRefresh && this.isCacheValid(packageJsonPath)) {
      return this.cache.get(packageJsonPath) || null;
    }

    try {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);

      const info: PackageJsonInfo = {
        name: packageJson.name || 'unknown',
        version: packageJson.version || '0.0.0',
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        scripts: packageJson.scripts || {},
        path: packageJsonPath
      };

      // Update cache
      this.cache.set(packageJsonPath, info);
      this.cacheTimestamp.set(packageJsonPath, Date.now());

      return info;
    } catch (error) {
      console.error('Error reading package.json:', error);
      return null;
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(packageJsonPath: string): boolean {
    const timestamp = this.cacheTimestamp.get(packageJsonPath);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < this.cacheTimeout;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp.clear();
  }

  // ==================== PACKAGE MANAGER DETECTION ====================

  /**
   * Detect which package manager is used
   */
  public async detectPackageManager(): Promise<PackageManager> {
    if (this.detectedPackageManager) {
      return this.detectedPackageManager;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return 'npm';
    }

    const rootPath = workspaceFolder.uri.fsPath;

    // Check for lock files in order of preference
    if (fs.existsSync(path.join(rootPath, 'pnpm-lock.yaml'))) {
      this.detectedPackageManager = 'pnpm';
    } else if (fs.existsSync(path.join(rootPath, 'yarn.lock'))) {
      this.detectedPackageManager = 'yarn';
    } else if (fs.existsSync(path.join(rootPath, 'bun.lockb'))) {
      this.detectedPackageManager = 'bun';
    } else {
      this.detectedPackageManager = 'npm';
    }

    return this.detectedPackageManager;
  }

  /**
   * Get commands for detected package manager
   */
  public async getPackageManagerCommands(): Promise<string[]> {
    const pm = await this.detectPackageManager();
    const info = await this.getPackageJson();
    if (!info) return [];

    const commands: string[] = [];
    const scriptNames = Object.keys(info.scripts);

    // Base commands
    if (pm === 'npm') {
      commands.push('npm install', 'npm install --save', 'npm install --save-dev', 'npm uninstall', 'npm update');
      for (const script of scriptNames) {
        commands.push(`npm run ${script}`);
      }
    } else if (pm === 'yarn') {
      commands.push('yarn add', 'yarn add -D', 'yarn remove', 'yarn upgrade');
      for (const script of scriptNames) {
        commands.push(`yarn ${script}`);
      }
    } else if (pm === 'pnpm') {
      commands.push('pnpm add', 'pnpm add -D', 'pnpm remove', 'pnpm update');
      for (const script of scriptNames) {
        commands.push(`pnpm ${script}`);
      }
    } else if (pm === 'bun') {
      commands.push('bun add', 'bun add -d', 'bun remove', 'bun update');
      for (const script of scriptNames) {
        commands.push(`bun run ${script}`);
      }
    }

    return [...new Set(commands)];
  }

  // ==================== SMART SUGGESTIONS ====================

  /**
   * Get smart package suggestions based on existing dependencies
   */
  public async getSmartSuggestions(): Promise<PackageSuggestion[]> {
    const info = await this.getPackageJson();
    if (!info) return [];

    const allDeps = [...Object.keys(info.dependencies), ...Object.keys(info.devDependencies)];
    const suggestions: PackageSuggestion[] = [];

    // If has React but no @types/react
    if (allDeps.includes('react') && !allDeps.includes('@types/react')) {
      suggestions.push({
        name: '@types/react',
        version: 'latest',
        type: 'devDependency',
        description: 'TypeScript definitions for React'
      });
    }

    // If has React but no react-dom
    if (allDeps.includes('react') && !allDeps.includes('react-dom')) {
      suggestions.push({
        name: 'react-dom',
        version: 'latest',
        type: 'dependency',
        description: 'React DOM library'
      });
    }

    // If has TypeScript but no @types/node
    if (allDeps.includes('typescript') && !allDeps.includes('@types/node')) {
      suggestions.push({
        name: '@types/node',
        version: 'latest',
        type: 'devDependency',
        description: 'TypeScript definitions for Node.js'
      });
    }

    // If has ESLint but no prettier
    if (allDeps.includes('eslint') && !allDeps.includes('prettier')) {
      suggestions.push({
        name: 'prettier',
        version: 'latest',
        type: 'devDependency',
        description: 'Code formatter (works great with ESLint)'
      });
    }

    // If has Jest but no @types/jest
    if (allDeps.includes('jest') && !allDeps.includes('@types/jest')) {
      suggestions.push({
        name: '@types/jest',
        version: 'latest',
        type: 'devDependency',
        description: 'TypeScript definitions for Jest'
      });
    }

    // If has Vue but no @types/node
    if (allDeps.includes('vue') && !allDeps.includes('@types/node')) {
      suggestions.push({
        name: '@types/node',
        version: 'latest',
        type: 'devDependency',
        description: 'TypeScript definitions for Node.js'
      });
    }

    // If has axios but no types
    if (allDeps.includes('axios') && !allDeps.includes('@types/axios')) {
      suggestions.push({
        name: '@types/axios',
        version: 'latest',
        type: 'devDependency',
        description: 'TypeScript definitions for axios'
      });
    }

    return suggestions;
  }

  /**
   * Get popular packages by category
   */
  public async getPopularPackages(category?: string): Promise<PackageSuggestion[]> {
    const info = await this.getPackageJson();
    const existingDeps = info 
      ? [...Object.keys(info.dependencies), ...Object.keys(info.devDependencies)]
      : [];

    const suggestions: PackageSuggestion[] = [];

    for (const [name, pkg] of Object.entries(POPULAR_PACKAGES)) {
      // Skip if already installed
      if (existingDeps.includes(name)) continue;
      
      // Filter by category if specified
      if (category && pkg.category !== category) continue;

      suggestions.push({
        name,
        version: 'latest',
        type: 'devDependency',
        description: pkg.description
      });
    }

    return suggestions.slice(0, 10);
  }

  // ==================== WORKSPACE SUPPORT (MONOREPO) ====================

  /**
   * Find all package.json files in workspace (for monorepos)
   */
  public async findAllPackageJsons(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    const packageJsonFiles: string[] = [];

    for (const folder of workspaceFolders) {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, '**/package.json'),
        '**/node_modules/**'
      );
      packageJsonFiles.push(...files.map(f => f.fsPath));
    }

    return packageJsonFiles;
  }

  /**
   * Get package info for all workspaces
   */
  public async getWorkspacePackages(): Promise<Map<string, PackageJsonInfo>> {
    const packageJsonPaths = await this.findAllPackageJsons();
    const packages = new Map<string, PackageJsonInfo>();

    for (const pkgPath of packageJsonPaths) {
      try {
        const content = fs.readFileSync(pkgPath, 'utf8');
        const packageJson = JSON.parse(content);

        const info: PackageJsonInfo = {
          name: packageJson.name || path.basename(path.dirname(pkgPath)),
          version: packageJson.version || '0.0.0',
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
          scripts: packageJson.scripts || {},
          path: pkgPath
        };

        packages.set(info.name, info);
      } catch (error) {
        console.error(`Error reading ${pkgPath}:`, error);
      }
    }

    return packages;
  }

  // ==================== BASIC METHODS ====================

  /**
   * Get all dependencies as an array
   */
  public async getAllDependencies(): Promise<string[]> {
    const info = await this.getPackageJson();
    if (!info) return [];

    const allDeps = [
      ...Object.keys(info.dependencies),
      ...Object.keys(info.devDependencies)
    ];

    return allDeps.sort();
  }

  /**
   * Get suggestions based on partial input
   */
  public async getSuggestions(input: string, maxResults: number = 10): Promise<PackageSuggestion[]> {
    const info = await this.getPackageJson();
    if (!info) return [];

    const suggestions: PackageSuggestion[] = [];
    const lowerInput = input.toLowerCase();

    // Search dependencies
    for (const [name, version] of Object.entries(info.dependencies)) {
      if (name.toLowerCase().includes(lowerInput)) {
        suggestions.push({
          name,
          version,
          type: 'dependency'
        });
      }
    }

    // Search devDependencies
    for (const [name, version] of Object.entries(info.devDependencies)) {
      if (name.toLowerCase().includes(lowerInput)) {
        suggestions.push({
          name,
          version,
          type: 'devDependency'
        });
      }
    }

    // Search scripts for relevant commands
    for (const [scriptName, scriptCommand] of Object.entries(info.scripts)) {
      if (scriptName.toLowerCase().includes(lowerInput) || 
          scriptCommand.toLowerCase().includes(lowerInput)) {
        suggestions.push({
          name: scriptName,
          version: info.version,
          type: 'script',
          command: scriptCommand,
          description: scriptCommand.substring(0, 50) + (scriptCommand.length > 50 ? '...' : '')
        });
      }
    }

    // Sort by relevance (exact match first, then starts with, then contains)
    suggestions.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerInput;
      const bExact = b.name.toLowerCase() === lowerInput;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.name.toLowerCase().startsWith(lowerInput);
      const bStarts = b.name.toLowerCase().startsWith(lowerInput);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.name.localeCompare(b.name);
    });

    return suggestions.slice(0, maxResults);
  }

  /**
   * Get common npm commands that work with the project
   */
  public async getNpmCommands(): Promise<string[]> {
    const info = await this.getPackageJson();
    if (!info) return [];

    const commands: string[] = [];
    const pmCommands = await this.getPackageManagerCommands();
    commands.push(...pmCommands);

    // Add common dependency-specific commands
    const allDeps = [...Object.keys(info.dependencies), ...Object.keys(info.devDependencies)];
    
    // Check for TypeScript
    if (allDeps.includes('typescript') || info.devDependencies?.typescript) {
      commands.push('npx tsc --init');
      commands.push('npx tsc');
    }

    // Check for ESLint
    if (allDeps.includes('eslint')) {
      commands.push('npx eslint .');
      commands.push('npx eslint --fix .');
    }

    // Check for Jest
    if (allDeps.includes('jest')) {
      commands.push('npx jest');
      commands.push('npx jest --watch');
    }

    // Check for Webpack
    if (allDeps.includes('webpack') || allDeps.includes('webpack-cli')) {
      commands.push('npx webpack');
      commands.push('npx webpack --mode production');
    }

    // Check for Vue
    if (allDeps.includes('vue')) {
      commands.push('npm run serve');
      commands.push('npm run build');
    }

    // Check for React
    if (allDeps.includes('react')) {
      commands.push('npm run start');
      commands.push('npm run build');
      commands.push('npm test');
    }

    return [...new Set(commands)];
  }

  /**
   * Check if a package exists in package.json
   */
  public async hasPackage(packageName: string): Promise<boolean> {
    const info = await this.getPackageJson();
    if (!info) return false;

    return packageName in info.dependencies || packageName in info.devDependencies;
  }

  /**
   * Get package type (dependency or devDependency)
   */
  public async getPackageType(packageName: string): Promise<'dependency' | 'devDependency' | null> {
    const info = await this.getPackageJson();
    if (!info) return null;

    if (packageName in info.dependencies) return 'dependency';
    if (packageName in info.devDependencies) return 'devDependency';
    return null;
  }

  /**
   * Get scripts as command array
   */
  public async getScripts(): Promise<{ name: string; command: string }[]> {
    const info = await this.getPackageJson();
    if (!info) return [];

    return Object.entries(info.scripts).map(([name, command]) => ({
      name,
      command
    }));
  }
}

/**
 * Get package.json parser instance
 */
export function getPackageJsonParser(): PackageJsonParser {
  return PackageJsonParser.getInstance();
}

/**
 * Quick helper to get package suggestions
 */
export async function getPackageSuggestions(input: string, maxResults: number = 10): Promise<PackageSuggestion[]> {
  const parser = PackageJsonParser.getInstance();
  return parser.getSuggestions(input, maxResults);
}
