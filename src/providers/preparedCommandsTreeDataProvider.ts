import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, ThemeIcon, EventEmitter } from 'vscode';
import { readTasksDotCommand, DotCommandTask } from '../providers/taskProvider';
import { getPreparedCommandCategories, getPreparedCommandsForCategory } from '../commands/prepared';
import {
  SearchFilterState,
  DEFAULT_SEARCH_FILTER_STATE,
  loadFilterState,
  saveFilterState,
  clearFilterState,
  filterPreparedCommands,
  STORAGE_KEYS
} from '../utils/searchFilter';

/**
 * Tree data provider for prepared (built-in) commands
 */
export class PreparedCommandsTreeDataProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined> = new EventEmitter<TreeItem | undefined>();
  private _searchFilterState: SearchFilterState;

  constructor() {
    this._searchFilterState = loadFilterState(STORAGE_KEYS.PREPARED_COMMANDS_FILTER);
  }

  getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Promise<TreeItem[]> {
    return this.getPreparedViewChildren(element);
  }

  private async getPreparedViewChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      // Root level - show prepared command categories
      const items: TreeItem[] = [];

      // Get all categories from the PREPARED_COMMANDS
      const allCategories = getPreparedCommandCategories();

      // Filter categories based on search/filter state
      let visibleCategories = allCategories;
      if (this._searchFilterState.isActive) {
        visibleCategories = allCategories.filter(category => {
          const commands = getPreparedCommandsForCategory(category);
          const filteredCommands = filterPreparedCommands(commands, this._searchFilterState);
          return filteredCommands.length > 0;
        });
      }

      // Create items for each visible category
      visibleCategories.forEach(category => {
        const categoryItem = this.createCategoryTreeItem(category);
        items.push(categoryItem);
      });

      // My Prepared Tasks from tasks.dotcommand - show if not filtered out
      const userTasks = await readTasksDotCommand();
      if (userTasks.length > 0) {
        // Apply filter to user tasks if active
        const filteredTasks = this._searchFilterState.isActive
          ? filterPreparedCommands(
              userTasks.map(task => ({
                name: task.label,
                command: task.command,
                description: task.description || '',
                category: 'My Prepared Tasks'
              })),
              this._searchFilterState
            )
          : userTasks;

        if (!this._searchFilterState.isActive || filteredTasks.length > 0) {
          const tasksItem = new TreeItem('📋 My Prepared Tasks', TreeItemCollapsibleState.Collapsed);
          tasksItem.iconPath = new ThemeIcon('tools');
          tasksItem.contextValue = 'preparedCategory';
          tasksItem.tooltip = 'Custom prepared tasks from tasks.dotcommand file';
          items.push(tasksItem);
        }
      }

      return items;
    }

    // Handle expansion of prepared categories
    if (element.contextValue === 'preparedCategory') {
      const label = typeof element.label === 'string' ? element.label : element.label?.label;
      // Extract category name from label (format: "emoji Category Name")
      const categoryName = label?.split(' ').slice(1).join(' ').trim();

      if (categoryName === 'My Prepared Tasks') {
        return this.getMyPreparedTasks();
      } else {
        // Handle dynamic categories from PREPARED_COMMANDS
        return this.getDynamicCategoryCommands(categoryName || '');
      }
    }

    return [];
  }

  private getPreparedGitCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Check Status', 'git status', 'View changes in your working directory'),
      this.createPreparedCommandItem('Stage Changes', 'git add .', 'Stage all changed files'),
      this.createPreparedCommandItem('Commit Changes', 'git commit -m "updates"', 'Commit staged changes with message'),
      this.createPreparedCommandItem('Push to Main', 'git push origin main', 'Push commits to main branch'),
      this.createPreparedCommandItem('Pull from Main', 'git pull origin main', 'Pull changes from main branch'),
      this.createPreparedCommandItem('View History', 'git log --oneline', 'View recent commit history'),
      this.createPreparedCommandItem('Create Branch', 'git checkout -b feature', 'Create and switch to new branch'),
      this.createPreparedCommandItem('Switch Branch', 'git checkout main', 'Switch to existing branch')
    ];
  }

  private getPreparedNpmCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Install Packages', 'npm install', 'Install all project dependencies'),
      this.createPreparedCommandItem('Start Dev Server', 'npm run dev', 'Run development server'),
      this.createPreparedCommandItem('Build Project', 'npm run build', 'Create production build'),
      this.createPreparedCommandItem('Run Tests', 'npm run test', 'Execute test suite'),
      this.createPreparedCommandItem('Run Linter', 'npm run lint', 'Check code quality'),
      this.createPreparedCommandItem('Add Package', 'npm install package-name', 'Install a specific package'),
      this.createPreparedCommandItem('Update Packages', 'npm update', 'Update all dependencies'),
      this.createPreparedCommandItem('Remove Package', 'npm uninstall package-name', 'Remove a package')
    ];
  }

  private getPreparedDockerCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Build Image', 'docker build -t myapp .', 'Build Docker image from Dockerfile'),
      this.createPreparedCommandItem('Run Container', 'docker run -p 3000:3000 myapp', 'Run Docker container'),
      this.createPreparedCommandItem('List Images', 'docker images', 'List all Docker images'),
      this.createPreparedCommandItem('List Containers', 'docker ps -a', 'List all containers'),
      this.createPreparedCommandItem('Docker Compose Up', 'docker-compose up -d', 'Start services with compose'),
      this.createPreparedCommandItem('View Logs', 'docker logs container-name', 'View container logs'),
      this.createPreparedCommandItem('Execute Shell', 'docker exec -it container-name sh', 'Execute shell in running container'),
      this.createPreparedCommandItem('Stop Container', 'docker stop container-name', 'Stop running container')
    ];
  }

  private getPreparedK8sCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Get Pods', 'kubectl get pods', 'List all pods in cluster'),
      this.createPreparedCommandItem('Get Services', 'kubectl get services', 'List all services'),
      this.createPreparedCommandItem('Get Logs', 'kubectl logs pod-name', 'View logs from pod'),
      this.createPreparedCommandItem('Apply Manifest', 'kubectl apply -f file.yml', 'Apply Kubernetes manifest'),
      this.createPreparedCommandItem('Delete Pod', 'kubectl delete pod pod-name', 'Delete specific pod'),
      this.createPreparedCommandItem('View Events', 'kubectl get events', 'Show cluster events'),
      this.createPreparedCommandItem('Check Status', 'kubectl cluster-info', 'Get cluster information'),
      this.createPreparedCommandItem('Scale Deployment', 'kubectl scale deployment app-name --replicas=3', 'Scale deployment replicas')
    ];
  }

  private getPreparedLinuxCommands(): TreeItem[] {
    return [
      this.createPreparedCommandItem('Current Directory', 'pwd', 'Print working directory path'),
      this.createPreparedCommandItem('List Files', 'ls -la', 'List files with detailed information'),
      this.createPreparedCommandItem('Change Directory', 'cd {directory}', 'Navigate to a folder'),
      this.createPreparedCommandItem('Create Directory', 'mkdir {directory}', 'Create a new directory'),
      this.createPreparedCommandItem('Remove Directory', 'rm -rf {directory}', 'Remove directory and contents'),
      this.createPreparedCommandItem('Copy File', 'cp {source} {destination}', 'Copy files or directories'),
      this.createPreparedCommandItem('Move File', 'mv {source} {destination}', 'Move or rename files'),
      this.createPreparedCommandItem('View File', 'cat {file}', 'Display file contents'),
      this.createPreparedCommandItem('Find Files', 'find {directory} -name "{pattern}"', 'Search for files by name'),
      this.createPreparedCommandItem('Search Text', 'grep "{search}" {file}', 'Search for text in files')
    ];
  }

  private async getMyPreparedTasks(): Promise<TreeItem[]> {
    const userTasks = await readTasksDotCommand();

    // Apply search/filter if active
    let filteredTasks: DotCommandTask[];
    if (this._searchFilterState.isActive) {
      const preparedFormatTasks = userTasks.map(task => ({
        name: task.label,
        command: task.command,
        description: task.description || '',
        category: 'My Prepared Tasks'
      }));
      const filteredPreparedTasks = filterPreparedCommands(preparedFormatTasks, this._searchFilterState);
      // Map back to original indices to get the original DotCommandTask objects
      const filteredCommands = filteredPreparedTasks.map(ft => ft.command);
      filteredTasks = userTasks.filter(task => filteredCommands.includes(task.command));
    } else {
      filteredTasks = userTasks;
    }

    return filteredTasks.map((task: DotCommandTask) => {
      const item = new TreeItem(task.label);
      item.description = task.command;
      item.tooltip = `${task.description || 'Custom prepared task'}\n\nRight-click: Run this task or Move to My Commands`;
      item.iconPath = new ThemeIcon('tools');
      item.contextValue = 'userPreparedTaskItem'; // Changed to differentiate from built-in prepared commands
      item.id = `user_prepared_task_${task.command.replace(/[^a-zA-Z0-9]/g, '_')}`;

      item.command = {
        command: 'dotcommand.runPreparedCommand',
        arguments: [task.command], // Pass the command template that will be looked up
        title: 'Run Prepared Task'
      };
      return item;
    });
  }

  private async getNpmTasks(): Promise<TreeItem[]> {
    const npmTasks = await readTasksDotCommand();

    return npmTasks.map((task: DotCommandTask) => {
      const item = new TreeItem(task.label);
      item.description = task.command;
      item.tooltip = `${task.description || 'NPM task from tasks.dotcommand'}\n\nRight-click: Run this task or Move to My Commands`;
      item.iconPath = new ThemeIcon('package');
      item.contextValue = 'userPreparedTaskItem'; // Changed to allow moving to My Commands
      item.id = `npm_task_${task.command.replace(/[^a-zA-Z0-9]/g, '_')}`;

      item.command = {
        command: 'dotcommand.runPreparedCommand',
        arguments: [task.command],
        title: 'Run NPM Task'
      };
      return item;
    });
  }

  /**
   * Create a category tree item with appropriate icon and tooltip
   */
  private createCategoryTreeItem(categoryName: string): TreeItem {
    const { icon, tooltip } = this.getCategoryDisplayInfo(categoryName);
    const item = new TreeItem(icon + ' ' + categoryName, TreeItemCollapsibleState.Collapsed);
    item.iconPath = this.getCategoryIcon(categoryName);
    item.contextValue = 'preparedCategory';
    item.tooltip = tooltip;
    return item;
  }

  /**
   * Get display information for a category
   */
  private getCategoryDisplayInfo(categoryName: string): { icon: string; tooltip: string } {
    const categoryMap: { [key: string]: { icon: string; tooltip: string } } = {
      'Git Commands': {
        icon: '🚀',
        tooltip: 'Essential Git commands for version control'
      },
      'Git Commands Advanced': {
        icon: '🌟',
        tooltip: 'Advanced Git commands for power users'
      },
      'NPM Commands': {
        icon: '📦',
        tooltip: 'Common NPM package management commands'
      },
      'Yarn Commands': {
        icon: '🧶',
        tooltip: 'Yarn package manager commands'
      },
      'Python Commands': {
        icon: '🐍',
        tooltip: 'Python development and management commands'
      },
      'Database Commands': {
        icon: '🗃️',
        tooltip: 'Database connection and management commands'
      },
      'Docker Commands': {
        icon: '🐳',
        tooltip: 'Docker container management commands'
      },
      'Kubernetes Commands': {
        icon: '☸️',
        tooltip: 'Kubernetes cluster management commands'
      },
      'Linux Commands': {
        icon: '🐧',
        tooltip: 'Essential Linux system commands'
      },
      'Code Quality Commands': {
        icon: '✨',
        tooltip: 'Code linting and formatting tools'
      },
      'Testing Commands': {
        icon: '🧪',
        tooltip: 'Testing frameworks and utilities'
      },
      'Deployment Commands': {
        icon: '🚀',
        tooltip: 'Application deployment commands'
      }
    };

    return categoryMap[categoryName] || {
      icon: '📁',
      tooltip: `Commands for ${categoryName.toLowerCase()}`
    };
  }

  /**
   * Get VS Code ThemeIcon for a category
   */
  private getCategoryIcon(categoryName: string): ThemeIcon {
    const iconMap: { [key: string]: ThemeIcon } = {
      'Git Commands': new ThemeIcon('git-branch'),
      'Git Commands Advanced': new ThemeIcon('git-commit'),
      'NPM Commands': new ThemeIcon('package'),
      'Yarn Commands': new ThemeIcon('extensions'),
      'Python Commands': new ThemeIcon('snake'),
      'Database Commands': new ThemeIcon('database'),
      'Docker Commands': new ThemeIcon('vm'),
      'Kubernetes Commands': new ThemeIcon('server-process'),
      'Linux Commands': new ThemeIcon('terminal'),
      'Code Quality Commands': new ThemeIcon('checklist'),
      'Testing Commands': new ThemeIcon('beaker'),
      'Deployment Commands': new ThemeIcon('cloud-upload')
    };

    return iconMap[categoryName] || new ThemeIcon('folder');
  }

  /**
   * Get commands for any dynamic category from PREPARED_COMMANDS
   */
  private getDynamicCategoryCommands(categoryName: string): TreeItem[] {
    const commands = getPreparedCommandsForCategory(categoryName);

    // Apply search/filter if active
    const filteredCommands = this._searchFilterState.isActive
      ? filterPreparedCommands(commands, this._searchFilterState)
      : commands;

    return filteredCommands.map(cmd => {
      const item = new TreeItem(cmd.name);
      item.description = cmd.command;
      item.tooltip = `${cmd.description}\n\nRight-click: Run this prepared command`;
      item.iconPath = new ThemeIcon('star');
      item.contextValue = 'preparedCommandItem';
      item.id = `prepared_${cmd.name.replace(/[^a-zA-Z0-9]/g, '_')}_${cmd.command.replace(/[^a-zA-Z0-9]/g, '_')}`;

      item.command = {
        command: 'dotcommand.runPreparedCommand',
        arguments: [cmd.command], // Pass the command template that will be looked up
        title: 'Run Prepared Command'
      };
      return item;
    });
  }

  private createPreparedCommandItem(name: string, command: string, description: string): TreeItem {
    const item = new TreeItem(name);
    item.description = command;
    item.tooltip = `${description}\n\nRight-click: Run this prepared command`;
    item.iconPath = new ThemeIcon('star');
    item.contextValue = 'preparedCommandItem';
    item.id = `prepared_${command.replace(/[^a-zA-Z0-9]/g, '_')}`;

    item.command = {
      command: 'dotcommand.runPreparedCommand',
      arguments: [command], // Pass the command template that will be looked up
      title: 'Run Prepared Command'
    };
    return item;
  }

  /**
   * Set search/filter state and refresh the tree
   */
  public setSearchFilterState(state: SearchFilterState): void {
    this._searchFilterState = state;
    saveFilterState(STORAGE_KEYS.PREPARED_COMMANDS_FILTER, state);
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Get current search/filter state
   */
  public getSearchFilterState(): SearchFilterState {
    return { ...this._searchFilterState };
  }

  /**
   * Clear search/filter and refresh the tree
   */
  public clearSearchFilter(): void {
    this._searchFilterState = { ...DEFAULT_SEARCH_FILTER_STATE };
    clearFilterState(STORAGE_KEYS.PREPARED_COMMANDS_FILTER);
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
