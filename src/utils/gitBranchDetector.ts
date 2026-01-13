import { workspace, Uri } from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git branch detector for dynamic template variables
 */
export class GitBranchDetector {
  private static readonly BRANCH_CACHE_DURATION = 10000; // 10 seconds
  private branchCache: { branches: string[]; timestamp: number } | null = null;

  /**
   * Get all Git branches for the current workspace
   */
  async getBranches(): Promise<string[]> {
    try {
      const workspaceFolder = workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        console.log('DEBUG: No workspace folder found');
        return [];
      }

      console.log('DEBUG: Workspace folder:', workspaceFolder.uri.fsPath);

      // Check cache first
      const now = Date.now();
      if (this.branchCache && (now - this.branchCache.timestamp) < GitBranchDetector.BRANCH_CACHE_DURATION) {
        console.log('DEBUG: Using cached branches:', this.branchCache.branches);
        return this.branchCache.branches;
      }

      // Check if .git directory exists
      const gitDir = Uri.joinPath(workspaceFolder.uri, '.git');
      try {
        await workspace.fs.stat(gitDir);
        console.log('DEBUG: .git directory found');
      } catch {
        console.log('DEBUG: .git directory not found - not a Git repository');
        // Not a Git repository
        return [];
      }

      console.log('DEBUG: Executing git branch --all command');

      // Execute git branch command
      const { stdout } = await execAsync('git branch --all', {
        cwd: workspaceFolder.uri.fsPath,
        timeout: 5000
      });

      console.log('DEBUG: Git branch output:', stdout);

      // Parse branch names
      const branches = this.parseBranches(stdout);
      console.log('DEBUG: Parsed branches:', branches);

      // Cache the result
      this.branchCache = {
        branches,
        timestamp: now
      };

      return branches;

    } catch (error) {
      console.warn('DEBUG: Error detecting Git branches:', error);
      return [];
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const workspaceFolder = workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return null;
      }

      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: workspaceFolder.uri.fsPath,
        timeout: 5000
      });

      return stdout.trim();
    } catch (error) {
      console.warn('Error getting current Git branch:', error);
      return null;
    }
  }

  /**
   * Parse Git branch output into clean branch names
   */
  private parseBranches(output: string): string[] {
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove leading indicators (*, remotes/, etc.)
        if (line.startsWith('* ')) {
          return line.substring(2);
        }
        if (line.startsWith('remotes/')) {
          return line.substring(8);
        }
        return line;
      })
      .filter(branch => branch.length > 0)
      .map(branch => {
        // Clean up remote branch names
        const parts = branch.split('/');
        return parts.length > 1 ? parts.slice(1).join('/') : branch;
      })
      // Remove duplicates
      .filter((branch, index, arr) => arr.indexOf(branch) === index)
      // Sort with current branch first (if it has *)
      .sort((a, b) => {
        if (a.includes('HEAD')) return 1;
        if (b.includes('HEAD')) return -1;
        return a.localeCompare(b);
      });
  }

  /**
   * Check if current workspace is a Git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      const workspaceFolder = workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return false;
      }

      const gitDir = Uri.joinPath(workspaceFolder.uri, '.git');
      await workspace.fs.stat(gitDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear branch cache (useful for testing)
   */
  clearCache(): void {
    this.branchCache = null;
  }
}

// Global instance
let gitBranchDetector: GitBranchDetector | undefined;

/**
 * Get Git branch detector instance
 */
export function getGitBranchDetector(): GitBranchDetector {
  if (!gitBranchDetector) {
    gitBranchDetector = new GitBranchDetector();
  }
  return gitBranchDetector;
}