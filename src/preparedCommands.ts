import { window } from 'vscode';

/**
 * Definition for a parameter that needs user input
 */
export interface CommandParameter {
  name: string;
  description: string;
  defaultValue?: string;
  validation?: (value: string) => boolean;
  validationMessage?: string;
}

/**
 * Definition for a prepared command with dynamic parameters
 */
export interface PreparedCommand {
  name: string;
  command: string;
  description: string;
  category: string;
  parameters: CommandParameter[];
}

/**
 * Available prepared commands with dynamic parameters
 */
const PREPARED_COMMANDS: PreparedCommand[] = [
  // Git Commands
  {
    name: 'Check Status',
    command: 'git status',
    description: 'View changes in your working directory',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Stage Changes',
    command: 'git add .',
    description: 'Stage all changed files',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Commit Changes',
    command: 'git commit -m "updates"',
    description: 'Commit staged changes with message',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Push to Main',
    command: 'git push origin main',
    description: 'Push commits to main branch',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Pull from Main',
    command: 'git pull origin main',
    description: 'Pull changes from main branch',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'View History',
    command: 'git log --oneline',
    description: 'View recent commit history',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Create Branch',
    command: 'git checkout -b feature',
    description: 'Create and switch to new branch',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Switch Branch',
    command: 'git checkout main',
    description: 'Switch to existing branch',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Create & Switch Branch',
    command: 'git checkout -b {branch}',
    description: 'Create a new branch and switch to it',
    category: 'Git Commands',
    parameters: [
      {
        name: 'branch',
        description: 'Branch name (e.g., feature/new-feature)',
        defaultValue: 'feature/new-feature'
      }
    ]
  },
  {
    name: 'Checkout Branch',
    command: 'git checkout {branch}',
    description: 'Switch to an existing branch',
    category: 'Git Commands',
    parameters: [
      {
        name: 'branch',
        description: 'Branch name (e.g., main, develop)',
        defaultValue: 'main'
      }
    ]
  },
  {
    name: 'Commit with Custom Message',
    command: 'git commit -m "{message}"',
    description: 'Commit staged changes with a custom message',
    category: 'Git Commands',
    parameters: [
      {
        name: 'message',
        description: 'Commit message',
        defaultValue: 'updates'
      }
    ]
  },
  {
    name: 'Push to Branch',
    command: 'git push origin {branch}',
    description: 'Push commits to a specific remote branch',
    category: 'Git Commands',
    parameters: [
      {
        name: 'branch',
        description: 'Remote branch name',
        defaultValue: 'main'
      }
    ]
  },
  {
    name: 'Pull from Branch',
    command: 'git pull origin {branch}',
    description: 'Pull changes from a specific remote branch',
    category: 'Git Commands',
    parameters: [
      {
        name: 'branch',
        description: 'Remote branch name',
        defaultValue: 'main'
      }
    ]
  },
  {
    name: 'Create Tag',
    command: 'git tag -a {tag} -m "{message}"',
    description: 'Create an annotated git tag',
    category: 'Git Commands',
    parameters: [
      {
        name: 'tag',
        description: 'Tag name (e.g., v1.0.0)',
        defaultValue: 'v1.0.0'
      },
      {
        name: 'message',
        description: 'Tag message',
        defaultValue: 'Release version {tag}'
      }
    ]
  },

  // NPM Commands
  {
    name: 'Install Packages',
    command: 'npm install',
    description: 'Install all project dependencies',
    category: 'NPM Commands',
    parameters: []
  },
  {
    name: 'Start Dev Server',
    command: 'npm run dev',
    description: 'Run development server',
    category: 'NPM Commands',
    parameters: []
  },
  {
    name: 'Build Project',
    command: 'npm run build',
    description: 'Create production build',
    category: 'NPM Commands',
    parameters: []
  },
  {
    name: 'Run Tests',
    command: 'npm run test',
    description: 'Execute test suite',
    category: 'NPM Commands',
    parameters: []
  },
  {
    name: 'Run Linter',
    command: 'npm run lint',
    description: 'Check code quality',
    category: 'NPM Commands',
    parameters: []
  },
  {
    name: 'Add Package',
    command: 'npm install package-name',
    description: 'Install a specific package',
    category: 'NPM Commands',
    parameters: []
  },
  {
    name: 'Update Packages',
    command: 'npm update',
    description: 'Update all dependencies',
    category: 'NPM Commands',
    parameters: []
  },
  {
    name: 'Remove Package',
    command: 'npm uninstall package-name',
    description: 'Remove a package',
    category: 'NPM Commands',
    parameters: []
  },
  {
    name: 'Install Package',
    command: 'npm install {package}',
    description: 'Install a specific NPM package',
    category: 'NPM Commands',
    parameters: [
      {
        name: 'package',
        description: 'Package name (e.g., lodash, react)',
        defaultValue: 'package-name'
      }
    ]
  },
  {
    name: 'Add Package Dependency',
    command: 'npm install --save-prod {package}',
    description: 'Add a production dependency',
    category: 'NPM Commands',
    parameters: [
      {
        name: 'package',
        description: 'Package name to add as dependency',
        defaultValue: 'package-name'
      }
    ]
  },
  {
    name: 'Add Package DevDependency',
    command: 'npm install --save-dev {package}',
    description: 'Add a development dependency',
    category: 'NPM Commands',
    parameters: [
      {
        name: 'package',
        description: 'Package name to add as dev dependency',
        defaultValue: 'dev-package-name'
      }
    ]
  },
  {
    name: 'Execute Custom Script',
    command: 'npm run {script}',
    description: 'Run a custom script defined in package.json',
    category: 'NPM Commands',
    parameters: [
      {
        name: 'script',
        description: 'Script name (e.g., dev, build, test)',
        defaultValue: 'dev'
      }
    ]
  },

  // Docker Commands
  {
    name: 'Build Image',
    command: 'docker build -t myapp .',
    description: 'Build Docker image from Dockerfile',
    category: 'Docker Commands',
    parameters: []
  },
  {
    name: 'Run Container',
    command: 'docker run -p 3000:3000 myapp',
    description: 'Run Docker container',
    category: 'Docker Commands',
    parameters: []
  },
  {
    name: 'List Images',
    command: 'docker images',
    description: 'List all Docker images',
    category: 'Docker Commands',
    parameters: []
  },
  {
    name: 'List Containers',
    command: 'docker ps -a',
    description: 'List all containers',
    category: 'Docker Commands',
    parameters: []
  },
  {
    name: 'Docker Compose Up',
    command: 'docker-compose up -d',
    description: 'Start services with compose',
    category: 'Docker Commands',
    parameters: []
  },
  {
    name: 'View Logs',
    command: 'docker logs container-name',
    description: 'View container logs',
    category: 'Docker Commands',
    parameters: []
  },
  {
    name: 'Execute Shell',
    command: 'docker exec -it container-name sh',
    description: 'Execute shell in running container',
    category: 'Docker Commands',
    parameters: []
  },
  {
    name: 'Stop Container',
    command: 'docker stop container-name',
    description: 'Stop running container',
    category: 'Docker Commands',
    parameters: []
  },
  {
    name: 'Build Custom Image',
    command: 'docker build -t {name} .',
    description: 'Build a Docker image with custom name',
    category: 'Docker Commands',
    parameters: [
      {
        name: 'name',
        description: 'Image name/tag',
        defaultValue: 'myapp',
        validation: (value) => /^[a-zA-Z0-9-_\.]+$/.test(value),
        validationMessage: 'Image name can only contain letters, numbers, dots, hyphens, and underscores'
      }
    ]
  },
  {
    name: 'Run Custom Container',
    command: 'docker run -p {port}:{port} {image}',
    description: 'Run a Docker container on a custom port',
    category: 'Docker Commands',
    parameters: [
      {
        name: 'port',
        description: 'Port number',
        defaultValue: '3000',
        validation: (value) => /^\d+$/.test(value) && parseInt(value) > 0 && parseInt(value) <= 65535,
        validationMessage: 'Port must be a number between 1-65535'
      },
      {
        name: 'image',
        description: 'Docker image name',
        defaultValue: 'myapp'
      }
    ]
  },
  {
    name: 'Execute Shell in Container',
    command: 'docker exec -it {container} sh',
    description: 'Execute shell in a running container',
    category: 'Docker Commands',
    parameters: [
      {
        name: 'container',
        description: 'Container name or ID',
        defaultValue: 'container-name'
      }
    ]
  },
  {
    name: 'View Container Logs',
    command: 'docker logs {container}',
    description: 'View logs from a running container',
    category: 'Docker Commands',
    parameters: [
      {
        name: 'container',
        description: 'Container name or ID',
        defaultValue: 'container-name'
      }
    ]
  },
  {
    name: 'Stop Custom Container',
    command: 'docker stop {container}',
    description: 'Stop a running container',
    category: 'Docker Commands',
    parameters: [
      {
        name: 'container',
        description: 'Container name or ID',
        defaultValue: 'container-name'
      }
    ]
  },

  // Kubernetes Commands
  {
    name: 'Get Pod Logs',
    command: 'kubectl logs {pod}',
    description: 'View logs from a specific pod',
    category: 'Kubernetes Commands',
    parameters: [
      {
        name: 'pod',
        description: 'Pod name',
        defaultValue: 'pod-name'
      }
    ]
  },
  {
    name: 'Apply Manifest',
    command: 'kubectl apply -f {manifest}',
    description: 'Apply a Kubernetes manifest file',
    category: 'Kubernetes Commands',
    parameters: [
      {
        name: 'manifest',
        description: 'Path to manifest file (e.g., deployment.yml)',
        defaultValue: 'deployment.yml'
      }
    ]
  },
  {
    name: 'Delete pod',
    command: 'kubectl delete pod {pod}',
    description: 'Delete a specific pod',
    category: 'Kubernetes Commands',
    parameters: [
      {
        name: 'pod',
        description: 'Pod name to delete',
        defaultValue: 'pod-name'
      }
    ]
  },
  {
    name: 'Scale Deployment',
    command: 'kubectl scale deployment {deployment} --replicas={replicas}',
    description: 'Scale a deployment to specified replicas',
    category: 'Kubernetes Commands',
    parameters: [
      {
        name: 'deployment',
        description: 'Deployment name',
        defaultValue: 'app-name'
      },
      {
        name: 'replicas',
        description: 'Number of replicas',
        defaultValue: '3',
        validation: (value) => /^\d+$/.test(value) && parseInt(value) >= 0,
        validationMessage: 'Replicas must be a positive number'
      }
    ]
  },

  // Linux Commands with Dynamic Parameters
  {
    name: 'List Files',
    command: 'ls -la',
    description: 'List files with detailed information',
    category: 'Linux Commands',
    parameters: []
  },
  {
    name: 'Current Directory',
    command: 'pwd',
    description: 'Print working directory path',
    category: 'Linux Commands',
    parameters: []
  },
  {
    name: 'Copy File',
    command: 'cp {source} {destination}',
    description: 'Copy a file to a new location',
    category: 'Linux Commands',
    parameters: [
      {
        name: 'source',
        description: 'Source file path with extension (e.g., source.txt, app.js)',
        defaultValue: 'source.txt',
        validation: (value) => /\.[a-zA-Z0-9]+$/.test(value),
        validationMessage: 'File name must include a file extension (e.g., .txt, .html, .js, .css)'
      },
      {
        name: 'destination',
        description: 'Destination file path with extension (e.g., destination.txt, app.js)',
        defaultValue: 'destination.txt',
        validation: (value) => /\.[a-zA-Z0-9]+$/.test(value),
        validationMessage: 'File name must include a file extension (e.g., .txt, .html, .js, .css)'
      }
    ]
  },
  {
    name: 'Move/Rename File',
    command: 'mv {source} {destination}',
    description: 'Move or rename a file (any file type)',
    category: 'Linux Commands',
    parameters: [
      {
        name: 'source',
        description: 'Current file path with extension (e.g., old-name.txt)',
        defaultValue: 'old-name.txt',
        validation: (value) => /\.[a-zA-Z0-9]+$/.test(value),
        validationMessage: 'File name must include a file extension (e.g., .txt, .html, .js, .css)'
      },
      {
        name: 'destination',
        description: 'New file path with extension (e.g., new-name.txt)',
        defaultValue: 'new-name.txt',
        validation: (value) => /\.[a-zA-Z0-9]+$/.test(value),
        validationMessage: 'File name must include a file extension (e.g., .txt, .html, .js, .css)'
      }
    ]
  },
  {
    name: 'View File',
    command: 'cat {file}',
    description: 'Display contents of a file (any file type)',
    category: 'Linux Commands',
    parameters: [
      {
        name: 'file',
        description: 'File path with extension (e.g., file.txt, app.js, style.css)',
        defaultValue: 'file.txt',
        validation: (value) => /\.[a-zA-Z0-9]+$/.test(value),
        validationMessage: 'File name must include a file extension (e.g., .txt, .html, .js, .css)'
      }
    ]
  },
  {
    name: 'Find Files',
    command: 'find {directory} -name "{pattern}"',
    description: 'Find files matching a pattern in specified directory',
    category: 'Linux Commands',
    parameters: [
      {
        name: 'directory',
        description: 'Directory to search in',
        defaultValue: '.'
      },
      {
        name: 'pattern',
        description: 'File pattern with wildcards (e.g., "*.txt", "*.js", "*config*")',
        defaultValue: '*.txt',
        validation: (value) => value.includes('*') || value.includes('?'),
        validationMessage: 'Pattern should include wildcards (* or ?) for effective searching'
      }
    ]
  },
  {
    name: 'Search Text in File',
    command: 'grep "{search}" {file}',
    description: 'Search for text within a specific file (any file type)',
    category: 'Linux Commands',
    parameters: [
      {
        name: 'search',
        description: 'Text to search for',
        defaultValue: 'search-term'
      },
      {
        name: 'file',
        description: 'File path with extension (e.g., file.txt, app.js, log.txt)',
        defaultValue: 'file.txt',
        validation: (value) => /\.[a-zA-Z0-9]+$/.test(value),
        validationMessage: 'File name must include a file extension (e.g., .txt, .html, .js, .css)'
      }
    ]
  },
  {
    name: 'Change Directory',
    command: 'cd {directory}',
    description: 'Change current working directory',
    category: 'Linux Commands',
    parameters: [
      {
        name: 'directory',
        description: 'Directory path to navigate to',
        defaultValue: '~/Desktop'
      }
    ]
  },
  {
    name: 'Create Custom Directory',
    command: 'mkdir {directory}',
    description: 'Create a new directory with custom name',
    category: 'Linux Commands',
    parameters: [
      {
        name: 'directory',
        description: 'Directory name/path to create',
        defaultValue: 'new-directory'
      }
    ]
  }
];

/**
 * Get prepared commands for a specific category
 */
export function getPreparedCommandsForCategory(categoryLabel: string): PreparedCommand[] {
  return PREPARED_COMMANDS.filter(cmd => cmd.category === categoryLabel);
}

/**
 * Get all prepared command categories
 */
export function getPreparedCommandCategories(): string[] {
  const categories = PREPARED_COMMANDS.map(cmd => cmd.category);
  return [...new Set(categories)]; // Remove duplicates
}

/**
 * Handle running a prepared command with dynamic parameters
 */
export async function handlePreparedCommand(commandTemplate: string): Promise<void> {
  // Find the command definition
  const preparedCommand = PREPARED_COMMANDS.find(cmd => cmd.command === commandTemplate);

  if (!preparedCommand) {
    window.showErrorMessage(`Prepared command template not found: ${commandTemplate}`);
    return;
  }

  try {
    // Collect parameter values from user
    const parameterValues: { [key: string]: string } = {};

    for (const param of preparedCommand.parameters) {
      let value: string | undefined;
      let attempt = 0;
      const maxAttempts = 3;

      do {
        attempt++;
        const prompt = `${param.description}${param.defaultValue ? ` (${param.defaultValue})` : ''}`;

        value = await window.showInputBox({
          prompt: prompt,
          placeHolder: param.defaultValue || param.name,
          value: param.defaultValue,
          validateInput: param.validation ? (value) => {
            if (!param.validation!(value)) {
              return param.validationMessage || 'Invalid input';
            }
            return null;
          } : undefined
        });

        // Allow cancel (empty return)
        if (value === undefined && attempt === 1) {
          return; // User cancelled
        }

        if (value === '' && param.defaultValue) {
          value = param.defaultValue;
        }

      } while (!value && attempt < maxAttempts);

      if (!value) {
        return; // User cancelled after multiple attempts
      }

      parameterValues[param.name] = value;
    }

    // Build the final command by replacing placeholders
    let finalCommand = commandTemplate;
    for (const [paramName, paramValue] of Object.entries(parameterValues)) {
      finalCommand = finalCommand.replace(new RegExp(`\\{${paramName}\\}`, 'g'), paramValue);
    }

    // Confirm before execution
    const confirm = await window.showWarningMessage(
      `Execute: "${finalCommand}"?`,
      { modal: true },
      'Yes, Run',
      'Cancel'
    );

    if (confirm === 'Yes, Run') {
      const terminal = window.activeTerminal || window.terminals[0];
      if (!terminal) {
        window.showErrorMessage('No active terminal found');
        return;
      }

      terminal.sendText(finalCommand);
      window.showInformationMessage(`Executed: ${finalCommand}`);
    }

  } catch (error) {
    window.showErrorMessage(`Error running prepared command: ${error}`);
  }
}

/**
 * Create command template registry map for quick lookups
 */
export function createCommandTemplateMap(commands: PreparedCommand[]): Map<string, PreparedCommand> {
  const map = new Map<string, PreparedCommand>();
  commands.forEach(cmd => {
    map.set(cmd.name, cmd);
  });
  return map;
}
