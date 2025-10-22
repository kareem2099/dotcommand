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
  },

  // Python Commands
  {
    name: 'Install Python Package',
    command: 'pip install {package}',
    description: 'Install a Python package using pip',
    category: 'Python Commands',
    parameters: [
      {
        name: 'package',
        description: 'Package name (e.g., requests, numpy, pandas)',
        defaultValue: 'requests'
      }
    ]
  },
  {
    name: 'Install Requirements',
    command: 'pip install -r requirements.txt',
    description: 'Install packages from requirements.txt',
    category: 'Python Commands',
    parameters: []
  },
  {
    name: 'Create Virtual Environment',
    command: 'python -m venv {name}',
    description: 'Create a new Python virtual environment',
    category: 'Python Commands',
    parameters: [
      {
        name: 'name',
        description: 'Virtual environment name',
        defaultValue: 'venv'
      }
    ]
  },
  {
    name: 'Activate Virtual Environment',
    command: 'source {name}/bin/activate',
    description: 'Activate a Python virtual environment',
    category: 'Python Commands',
    parameters: [
      {
        name: 'name',
        description: 'Virtual environment name',
        defaultValue: 'venv'
      }
    ]
  },
  {
    name: 'Run Python Script',
    command: 'python {script}',
    description: 'Execute a Python script',
    category: 'Python Commands',
    parameters: [
      {
        name: 'script',
        description: 'Python script file (e.g., main.py, app.py)',
        defaultValue: 'main.py',
        validation: (value) => value.endsWith('.py'),
        validationMessage: 'File must be a Python script (.py extension)'
      }
    ]
  },
  {
    name: 'Run Django Server',
    command: 'python manage.py runserver',
    description: 'Start Django development server',
    category: 'Python Commands',
    parameters: []
  },
  {
    name: 'Make Django Migrations',
    command: 'python manage.py makemigrations',
    description: 'Create Django database migrations',
    category: 'Python Commands',
    parameters: []
  },
  {
    name: 'Run Django Migrations',
    command: 'python manage.py migrate',
    description: 'Apply Django database migrations',
    category: 'Python Commands',
    parameters: []
  },

  // Yarn Commands
  {
    name: 'Yarn Install',
    command: 'yarn install',
    description: 'Install all project dependencies with Yarn',
    category: 'Yarn Commands',
    parameters: []
  },
  {
    name: 'Yarn Add Package',
    command: 'yarn add {package}',
    description: 'Add a package with Yarn',
    category: 'Yarn Commands',
    parameters: [
      {
        name: 'package',
        description: 'Package name (e.g., lodash, react)',
        defaultValue: 'package-name'
      }
    ]
  },
  {
    name: 'Yarn Add Dev Package',
    command: 'yarn add -D {package}',
    description: 'Add a dev dependency with Yarn',
    category: 'Yarn Commands',
    parameters: [
      {
        name: 'package',
        description: 'Package name',
        defaultValue: 'dev-package-name'
      }
    ]
  },
  {
    name: 'Yarn Dev',
    command: 'yarn dev',
    description: 'Start development server with Yarn',
    category: 'Yarn Commands',
    parameters: []
  },
  {
    name: 'Yarn Build',
    command: 'yarn build',
    description: 'Build project for production with Yarn',
    category: 'Yarn Commands',
    parameters: []
  },
  {
    name: 'Yarn Test',
    command: 'yarn test',
    description: 'Run tests with Yarn',
    category: 'Yarn Commands',
    parameters: []
  },

  // Database Commands
  {
    name: 'MySQL Connect',
    command: 'mysql -u {user} -p -h {host} {database}',
    description: 'Connect to MySQL database',
    category: 'Database Commands',
    parameters: [
      {
        name: 'user',
        description: 'MySQL username',
        defaultValue: 'root'
      },
      {
        name: 'host',
        description: 'MySQL host',
        defaultValue: 'localhost'
      },
      {
        name: 'database',
        description: 'Database name',
        defaultValue: 'mydb'
      }
    ]
  },
  {
    name: 'PostgreSQL Connect',
    command: 'psql -h {host} -U {user} -d {database}',
    description: 'Connect to PostgreSQL database',
    category: 'Database Commands',
    parameters: [
      {
        name: 'host',
        description: 'PostgreSQL host',
        defaultValue: 'localhost'
      },
      {
        name: 'user',
        description: 'PostgreSQL username',
        defaultValue: 'postgres'
      },
      {
        name: 'database',
        description: 'Database name',
        defaultValue: 'mydb'
      }
    ]
  },
  {
    name: 'MongoDB Connect',
    command: 'mongosh "mongodb://{host}:{port}/{database}"',
    description: 'Connect to MongoDB database',
    category: 'Database Commands',
    parameters: [
      {
        name: 'host',
        description: 'MongoDB host',
        defaultValue: 'localhost'
      },
      {
        name: 'port',
        description: 'MongoDB port',
        defaultValue: '27017'
      },
      {
        name: 'database',
        description: 'Database name',
        defaultValue: 'mydb'
      }
    ]
  },
  {
    name: 'Redis CLI',
    command: 'redis-cli -h {host} -p {port}',
    description: 'Connect to Redis server',
    category: 'Database Commands',
    parameters: [
      {
        name: 'host',
        description: 'Redis host',
        defaultValue: 'localhost'
      },
      {
        name: 'port',
        description: 'Redis port',
        defaultValue: '6379'
      }
    ]
  },

  // Advanced Git Commands
  {
    name: 'Git Stash Changes',
    command: 'git stash',
    description: 'Stash current changes',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Git Stash Pop',
    command: 'git stash pop',
    description: 'Apply and remove latest stash',
    category: 'Git Commands',
    parameters: []
  },
  {
    name: 'Git Merge Branch',
    command: 'git merge {branch}',
    description: 'Merge specified branch into current branch',
    category: 'Git Commands',
    parameters: [
      {
        name: 'branch',
        description: 'Branch to merge',
        defaultValue: 'feature-branch'
      }
    ]
  },
  {
    name: 'Git Rebase Branch',
    command: 'git rebase {branch}',
    description: 'Rebase current branch onto specified branch',
    category: 'Git Commands',
    parameters: [
      {
        name: 'branch',
        description: 'Branch to rebase onto',
        defaultValue: 'main'
      }
    ]
  },
  {
    name: 'Git Cherry Pick',
    command: 'git cherry-pick {commit}',
    description: 'Cherry-pick a specific commit',
    category: 'Git Commands',
    parameters: [
      {
        name: 'commit',
        description: 'Commit hash to cherry-pick',
        defaultValue: 'abc123'
      }
    ]
  },
  {
    name: 'Git Reset Hard',
    command: 'git reset --hard {commit}',
    description: 'Reset to specific commit (WARNING: destructive)',
    category: 'Git Commands',
    parameters: [
      {
        name: 'commit',
        description: 'Commit hash or HEAD~N',
        defaultValue: 'HEAD~1'
      }
    ]
  },

  // Code Quality Tools
  {
    name: 'ESLint Fix',
    command: 'npx eslint {files} --fix',
    description: 'Fix ESLint issues automatically',
    category: 'Code Quality Commands',
    parameters: [
      {
        name: 'files',
        description: 'Files to lint (e.g., src/, *.js)',
        defaultValue: 'src/'
      }
    ]
  },
  {
    name: 'Prettier Format',
    command: 'npx prettier --write {files}',
    description: 'Format code with Prettier',
    category: 'Code Quality Commands',
    parameters: [
      {
        name: 'files',
        description: 'Files to format (e.g., src/, *.js)',
        defaultValue: 'src/'
      }
    ]
  },
  {
    name: 'TypeScript Check',
    command: 'npx tsc --noEmit',
    description: 'Run TypeScript type checking',
    category: 'Code Quality Commands',
    parameters: []
  },
  {
    name: 'Stylelint Fix',
    command: 'npx stylelint {files} --fix',
    description: 'Fix CSS linting issues',
    category: 'Code Quality Commands',
    parameters: [
      {
        name: 'files',
        description: 'CSS files to lint',
        defaultValue: '*.css'
      }
    ]
  },

  // Testing Tools
  {
    name: 'Jest Watch',
    command: 'npx jest --watch',
    description: 'Run Jest tests in watch mode',
    category: 'Testing Commands',
    parameters: []
  },
  {
    name: 'Jest Coverage',
    command: 'npx jest --coverage',
    description: 'Run Jest tests with coverage report',
    category: 'Testing Commands',
    parameters: []
  },
  {
    name: 'Cypress Open',
    command: 'npx cypress open',
    description: 'Open Cypress test runner',
    category: 'Testing Commands',
    parameters: []
  },
  {
    name: 'Cypress Run',
    command: 'npx cypress run',
    description: 'Run Cypress tests headlessly',
    category: 'Testing Commands',
    parameters: []
  },
  {
    name: 'Playwright Test',
    command: 'npx playwright test',
    description: 'Run Playwright tests',
    category: 'Testing Commands',
    parameters: []
  },
  {
    name: 'Vitest Run',
    command: 'npx vitest run',
    description: 'Run Vitest tests',
    category: 'Testing Commands',
    parameters: []
  },

  // Deployment Commands
  {
    name: 'Vercel Deploy',
    command: 'npx vercel --prod',
    description: 'Deploy to Vercel production',
    category: 'Deployment Commands',
    parameters: []
  },
  {
    name: 'Netlify Deploy',
    command: 'npx netlify deploy --prod',
    description: 'Deploy to Netlify production',
    category: 'Deployment Commands',
    parameters: []
  },
  {
    name: 'Firebase Deploy',
    command: 'firebase deploy',
    description: 'Deploy to Firebase',
    category: 'Deployment Commands',
    parameters: []
  },
  {
    name: 'Heroku Deploy',
    command: 'git push heroku main',
    description: 'Deploy to Heroku',
    category: 'Deployment Commands',
    parameters: []
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
      // Get existing terminal or create new one
      let terminal = window.activeTerminal || window.terminals[0];
      if (!terminal) {
        terminal = window.createTerminal('DotCommand');
      }

      // Show the terminal and wait for it to be ready
      terminal.show();

      // Wait for terminal to be ready, then send command
      setTimeout(() => {
        terminal.sendText(finalCommand);
        window.showInformationMessage(`Executed: ${finalCommand}`);
      }, 500); // Wait 500ms for terminal to fully open
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
