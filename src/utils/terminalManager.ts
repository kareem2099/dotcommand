import { window, Terminal, Uri, ExtensionContext, workspace } from 'vscode';

interface TerminalInfo {
  terminal: Terminal;
  category: string;
  lastActivity: number;
  commandHistory: string[];
}

interface CategoryConfig {
  name: string;
  keywords: string[];
  color?: string;
}

/**
 * Terminal Manager for category-based terminal management with cleanup
 */
export class TerminalManager {
  private terminals = new Map<string, TerminalInfo>();
  private context: ExtensionContext;
  private cleanupTimer?: NodeJS.Timeout;
  private readonly CLEANUP_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly WARNING_TIME = 2 * 60 * 1000; // 2 minutes before cleanup

  // Category configurations for different command types
  // ORDER MATTERS: first match wins. Keep specific entries before generic ones.
  private readonly categories: CategoryConfig[] = [
    { name: 'Git',            keywords: ['git', 'commit', 'push', 'pull', 'merge', 'branch', 'checkout', 'stash', 'rebase', 'cherry-pick', 'tag'] },
    { name: 'NPM',            keywords: ['npm', 'yarn', 'pnpm', 'node_modules', 'webpack', 'babel'] },
    { name: 'Docker',         keywords: ['docker', 'docker-compose', 'kubectl', 'k8s', 'helm'] },
    // Rust — MUST be before Go because 'cargo' contains 'go'
    { name: 'Rust',           keywords: ['cargo'] },
    { name: 'Python',         keywords: ['python', 'pip', 'venv', 'requirements.txt', 'django', 'flask', 'pytest', 'black', 'flake8'] },
    // Database — before Go because 'mongo' contains 'go'
    { name: 'Database',       keywords: ['mysql', 'postgresql', 'psql', 'mongosh', 'redis-cli', 'sqlite3', 'redis'] },
    // VS Code Extension — before Linux so "vsce ls" doesn't match Linux
    { name: 'VS Code Extension', keywords: ['vsce', 'ovsx'] },
    // Flutter / Dart
    { name: 'Flutter',        keywords: ['flutter', 'dart format', 'dart test'] },
    // Gradle / Maven — before Linux
    { name: 'Gradle & Maven', keywords: ['gradlew', 'gradle', 'mvn'] },
    // SSH / Remote — before Linux (Linux also lists ssh/scp/rsync)
    { name: 'SSH & Remote',   keywords: ['ssh-keygen', 'ssh-copy-id', 'ssh ', 'scp ', 'rsync'] },
    // Terraform / AWS
    { name: 'Cloud',          keywords: ['terraform', 'aws ', 'gcloud', 'azure'] },
    // Go — last specific before Linux (all 'go' prefixed commands)
    { name: 'Go',             keywords: ['go build', 'go run', 'go test', 'go mod', 'go get', 'go vet', 'go fmt', 'gofmt'] },
    { name: 'Linux',          keywords: ['ls ', 'ls -', 'cd ', 'mkdir', 'rm -', 'cp ', 'mv ', 'chmod', 'chown', 'grep', 'find ', 'cat ', 'tail ', 'head ', 'df ', 'ps ', 'free'] }
  ];

  constructor(context: ExtensionContext) {
    this.context = context;
    this.startCleanupTimer();
  }

  /**
   * Get or create a terminal for the given command category
   */
  getOrCreateTerminal(command: string, context?: ExtensionContext): Terminal {
    const config = workspace.getConfiguration('dotcommand');
    const categoryEnabled = config.get<boolean>('terminal.category.enabled', true);

    const category = categoryEnabled ? this.detectCategory(command) : 'General';
    const terminalName = `DotCommand${category !== 'General' ? `-${category}` : ''}`;

    // Check if terminal already exists and is still active
    const terminalInfo = this.terminals.get(terminalName);
    if (terminalInfo && !terminalInfo.terminal.exitStatus) {
      // Update activity time
      terminalInfo.lastActivity = Date.now();
      return terminalInfo.terminal;
    }

    // Create new terminal
    const iconPath = context ? Uri.joinPath(context.extensionUri, 'assets', 'icons', 'icon.png') : undefined;
    const terminal = window.createTerminal({
      name: terminalName,
      iconPath: iconPath
    });

    // Store terminal info
    this.terminals.set(terminalName, {
      terminal,
      category,
      lastActivity: Date.now(),
      commandHistory: []
    });

    // Listen for terminal disposal
    const disposable = window.onDidCloseTerminal(closedTerminal => {
      if (closedTerminal === terminal) {
        this.terminals.delete(terminalName);
        disposable.dispose();
      }
    });

    return terminal;
  }

  /**
   * Detect command category based on keywords
   */
  private detectCategory(command: string): string {
    const lowerCommand = command.toLowerCase();

    for (const category of this.categories) {
      if (category.keywords.some(keyword => lowerCommand.includes(keyword))) {
        return category.name;
      }
    }

    return 'General';
  }

  /**
   * Track command execution in terminal
   */
  trackCommand(terminalName: string, command: string): void {
    const terminalInfo = this.terminals.get(terminalName);
    if (terminalInfo) {
      terminalInfo.lastActivity = Date.now();
      terminalInfo.commandHistory.push(command);

      // Keep only last 50 commands
      if (terminalInfo.commandHistory.length > 50) {
        terminalInfo.commandHistory = terminalInfo.commandHistory.slice(-50);
      }
    }
  }

  /**
   * Get command history for a terminal
   */
  getCommandHistory(terminalName: string): string[] {
    const terminalInfo = this.terminals.get(terminalName);
    return terminalInfo ? [...terminalInfo.commandHistory] : [];
  }

  /**
   * Start the cleanup timer to check for inactive terminals
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.checkAndCleanupTerminals();
    }, this.CLEANUP_CHECK_INTERVAL);
  }

  /**
   * Check for inactive terminals and show warnings/clean them up
   */
  private async checkAndCleanupTerminals(): Promise<void> {
    const config = workspace.getConfiguration('dotcommand');
    const cleanupEnabled = config.get<boolean>('terminal.cleanup.enabled', true);
    const timeoutMinutes = config.get<number>('terminal.cleanup.timeoutMinutes', 30);

    if (!cleanupEnabled) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const now = Date.now();

    for (const [terminalName, terminalInfo] of this.terminals.entries()) {
      const inactiveTime = now - terminalInfo.lastActivity;

      if (inactiveTime >= timeoutMs) {
        // Terminal has been inactive too long, close it
        terminalInfo.terminal.dispose();
        this.terminals.delete(terminalName);
        console.log(`Auto-closed inactive terminal: ${terminalName}`);
      } else if (inactiveTime >= (timeoutMs - this.WARNING_TIME)) {
        // Show warning notification
        const remainingMinutes = Math.ceil((timeoutMs - inactiveTime) / (60 * 1000));
        const warningMessage = `Terminal "${terminalName}" will be closed in ${remainingMinutes} minute(s) due to inactivity.`;

        window.showWarningMessage(warningMessage, 'Keep Terminal', 'Close Now').then(action => {
          if (action === 'Keep Terminal') {
            // Reset activity time to prevent cleanup
            terminalInfo.lastActivity = Date.now();
          } else if (action === 'Close Now') {
            terminalInfo.terminal.dispose();
            this.terminals.delete(terminalName);
          }
        });
      }
    }
  }

  /**
   * Manually cleanup all inactive terminals
   */
  async cleanupInactiveTerminals(): Promise<void> {
    const config = workspace.getConfiguration('dotcommand');
    const timeoutMinutes = config.get<number>('terminal.cleanup.timeoutMinutes', 30);
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const now = Date.now();

    let cleanedCount = 0;
    for (const [terminalName, terminalInfo] of this.terminals.entries()) {
      const inactiveTime = now - terminalInfo.lastActivity;
      if (inactiveTime >= timeoutMs) {
        terminalInfo.terminal.dispose();
        this.terminals.delete(terminalName);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      window.showInformationMessage(`Cleaned up ${cleanedCount} inactive terminal(s)`);
    } else {
      window.showInformationMessage('No inactive terminals to clean up');
    }
  }

  /**
   * Get all active DotCommand terminals
   */
  getActiveTerminals(): TerminalInfo[] {
    return Array.from(this.terminals.values()).filter(info => !info.terminal.exitStatus);
  }

  /**
   * Dispose of the terminal manager
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Close all terminals
    for (const terminalInfo of this.terminals.values()) {
      terminalInfo.terminal.dispose();
    }

    this.terminals.clear();
  }
}

// Global instance
let terminalManager: TerminalManager | undefined;

/**
 * Initialize the terminal manager
 */
export function initializeTerminalManager(context: ExtensionContext): void {
  terminalManager = new TerminalManager(context);
}

/**
 * Get the terminal manager instance
 */
export function getTerminalManager(): TerminalManager {
  if (!terminalManager) {
    throw new Error('TerminalManager not initialized');
  }
  return terminalManager;
}
