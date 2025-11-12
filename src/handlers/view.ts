import { commands, TreeItem, TreeItemCollapsibleState, ThemeIcon } from 'vscode';

/**
 * Handle the view commands action
 */
export async function handleViewCommands(): Promise<void> {
  // Reveal the tree view in the sidebar
  commands.executeCommand('dotcommand.commandsView.focus');
}

/**
 * Get prepared commands tree items
 */
export function getPreparedCommandsTreeItems(): TreeItem[] {
  const items: TreeItem[] = [];

  // Git Commands Category
  const gitItem = new TreeItem('🚀 Git Commands', TreeItemCollapsibleState.Collapsed);
  gitItem.iconPath = new ThemeIcon('git-branch');
  gitItem.contextValue = 'preparedCategory';
  gitItem.tooltip = 'Essential Git commands for version control';
  items.push(gitItem);

  // NPM Commands Category
  const npmItem = new TreeItem('📦 NPM Commands', TreeItemCollapsibleState.Collapsed);
  npmItem.iconPath = new ThemeIcon('package');
  npmItem.contextValue = 'preparedCategory';
  npmItem.tooltip = 'Common NPM package management commands';
  items.push(npmItem);

  // Linux Commands Category
  const linuxItem = new TreeItem('🐧 Linux Commands', TreeItemCollapsibleState.Collapsed);
  linuxItem.iconPath = new ThemeIcon('terminal');
  linuxItem.contextValue = 'preparedCategory';
  linuxItem.tooltip = 'Essential Linux system commands';
  items.push(linuxItem);

  return items;
}

/**
 * Get prepared commands for a specific category
 */
export function getPreparedCommandsForCategory(categoryLabel: string): TreeItem[] {
  let commands: Array<{name: string, command: string, description: string}> = [];

  if (categoryLabel.includes('Git Commands')) {
    commands = [
      { name: 'Check Status', command: 'git status', description: 'View changes in your working directory' },
      { name: 'Stage Changes', command: 'git add .', description: 'Stage all changed files' },
      { name: 'Commit Changes', command: 'git commit -m "fix-bugs"', description: 'Commit staged changes with message' },
      { name: 'Push to Main', command: 'git push origin main', description: 'Push commits to main branch' },
      { name: 'Pull from Main', command: 'git pull origin main', description: 'Pull changes from main branch' },
      { name: 'View History', command: 'git log --oneline', description: 'View recent commit history' },
      { name: 'Create Branch', command: 'git checkout -b feature', description: 'Create and switch to new branch' },
      { name: 'Switch Branch', command: 'git checkout main', description: 'Switch to existing branch' }
    ];
  } else if (categoryLabel.includes('NPM Commands')) {
    commands = [
      { name: 'Install Packages', command: 'npm install', description: 'Install all project dependencies' },
      { name: 'Start Dev Server', command: 'npm run dev', description: 'Run development server' },
      { name: 'Build Project', command: 'npm run build', description: 'Create production build' },
      { name: 'Run Tests', command: 'npm run test', description: 'Execute test suite' },
      { name: 'Run Linter', command: 'npm run lint', description: 'Check code quality' },
      { name: 'Add Package', command: 'npm install package-name', description: 'Install a specific package' },
      { name: 'Update Packages', command: 'npm update', description: 'Update all dependencies' },
      { name: 'Remove Package', command: 'npm uninstall package-name', description: 'Remove a package' }
    ];
  } else if (categoryLabel.includes('Linux Commands')) {
    commands = [
      { name: 'Current Directory', command: 'pwd', description: 'Print working directory path' },
      { name: 'List Files', command: 'ls -la', description: 'List files with detailed information' },
      { name: 'Change Directory', command: 'cd folder', description: 'Navigate to a folder' },
      { name: 'Create Directory', command: 'mkdir newfolder', description: 'Create a new directory' },
      { name: 'Remove Directory', command: 'rm -rf folder', description: 'Remove directory and contents' },
      { name: 'Copy File', command: 'cp file1.txt file2.txt', description: 'Copy files or directories' },
      { name: 'Move File', command: 'mv file1.txt file2.txt', description: 'Move or rename files' },
      { name: 'View File', command: 'cat file.txt', description: 'Display file contents' },
      { name: 'Find Files', command: 'find . -name "*.txt"', description: 'Search for files by name' },
      { name: 'Search Text', command: 'grep "search" file.txt', description: 'Search for text in files' }
    ];
  }

  // Convert to TreeItem instances with proper context
  return commands.map(cmd => {
    const item = new TreeItem(cmd.name);
    item.description = cmd.command;
    item.tooltip = `${cmd.description}\n\nRight-click: Run this prepared command`;
    item.iconPath = new ThemeIcon('terminal');
    item.contextValue = 'preparedCommandItem';
    item.id = `prepared_${cmd.command.replace(/[^a-zA-Z0-9]/g, '_')}`;
    item.command = {
      command: 'dotcommand.runPreparedCommand',
      arguments: [item],
      title: 'Run Prepared Command'
    };
    return item;
  });
}
