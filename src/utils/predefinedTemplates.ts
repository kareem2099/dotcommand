import { TemplateCategory } from './commandTemplates';

/**
 * Predefined command template categories for Smart Context Awareness
 * Each category includes context triggers that automatically suggest templates
 * based on project files and technologies detected in the workspace.
 */
export function getPredefinedCategories(): TemplateCategory[] {
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
          contextTriggers: [
            { type: 'directoryExists', path: '.git', weight: 10 }
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
          contextTriggers: [
            { type: 'directoryExists', path: '.git', weight: 10 }
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
              type: 'dropdown',
              dynamicOptions: 'git-branches',
              defaultValue: 'main',
              required: true
            }
          ],
          contextTriggers: [
            { type: 'directoryExists', path: '.git', weight: 10 }
          ],
          tags: ['push', 'remote', 'dynamic'],
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
          contextTriggers: [
            { type: 'fileExists', path: 'Dockerfile', weight: 10 },
            { type: 'fileExists', path: 'docker-compose.yml', weight: 8 }
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
          contextTriggers: [
            { type: 'fileExists', path: 'Dockerfile', weight: 8 },
            { type: 'fileExists', path: 'docker-compose.yml', weight: 6 }
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
              description: 'Package name from package.json',
              type: 'package',
              defaultValue: 'lodash',
              required: true
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'package.json', weight: 10 }
          ],
          tags: ['install', 'package', 'dynamic'],
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
          contextTriggers: [
            { type: 'fileExists', path: 'package.json', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"scripts"', weight: 5 }
          ],
          tags: ['script', 'run'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    },
    {
      name: 'Python',
      description: 'Python development and package management',
      icon: 'python',
      templates: [
        {
          id: 'python-venv-create',
          name: 'Create Virtual Environment',
          description: 'Create a new Python virtual environment',
          template: 'python -m venv {env_name}',
          category: 'Python',
          variables: [
            {
              name: 'env_name',
              description: 'Virtual environment name (e.g., venv, .venv)',
              defaultValue: 'venv',
              required: true
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'requirements.txt', weight: 8 },
            { type: 'fileExists', path: 'pyproject.toml', weight: 8 },
            { type: 'fileExists', path: 'setup.py', weight: 6 }
          ],
          tags: ['virtualenv', 'environment'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'python-install-requirements',
          name: 'Install Requirements',
          description: 'Install Python packages from requirements.txt',
          template: 'pip install -r requirements.txt',
          category: 'Python',
          variables: [],
          contextTriggers: [
            { type: 'fileExists', path: 'requirements.txt', weight: 10 }
          ],
          tags: ['pip', 'install', 'requirements'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'python-pytest-run',
          name: 'Run Tests with pytest',
          description: 'Execute Python tests using pytest',
          template: 'python -m pytest {test_path}',
          category: 'Python',
          variables: [
            {
              name: 'test_path',
              description: 'Test file or directory path',
              defaultValue: 'tests/',
              required: false
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'requirements.txt', weight: 6 },
            { type: 'fileExists', path: 'pyproject.toml', weight: 6 },
            { type: 'fileContains', path: 'requirements.txt', pattern: 'pytest', weight: 8 }
          ],
          tags: ['testing', 'pytest'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    },
    {
      name: 'React',
      description: 'React.js development workflows',
      icon: 'react',
      templates: [
        {
          id: 'react-create-component',
          name: 'Create React Component',
          description: 'Create a new React component file',
          template: 'touch src/components/{component_name}.jsx && echo "import React from \'react\';\n\nconst {component_name} = () => {\n  return (\n    <div>\n      <h1>{component_name} Component</h1>\n    </div>\n  );\n};\n\nexport default {component_name};" > src/components/{component_name}.jsx',
          category: 'React',
          variables: [
            {
              name: 'component_name',
              description: 'Component name (PascalCase)',
              defaultValue: 'MyComponent',
              required: true,
              validation: {
                pattern: '^[A-Z][a-zA-Z0-9]*$',
                message: 'Component name must start with capital letter'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"react"', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"@types/react"', weight: 3 },
            { type: 'fileExists', path: 'src/components', weight: 2 }
          ],
          tags: ['component', 'jsx', 'frontend'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'react-create-hook',
          name: 'Create Custom Hook',
          description: 'Create a new custom React hook',
          template: 'touch src/hooks/use{hook_name}.js && echo "import { useState, useEffect } from \'react\';\n\nexport const use{hook_name} = () => {\n  const [data, setData] = useState(null);\n  \n  useEffect(() => {\n    // Hook logic here\n  }, []);\n  \n  return { data, setData };\n};" > src/hooks/use{hook_name}.js',
          category: 'React',
          variables: [
            {
              name: 'hook_name',
              description: 'Hook name (camelCase, starting with use)',
              defaultValue: 'MyHook',
              required: true,
              validation: {
                pattern: '^[A-Z][a-zA-Z0-9]*$',
                message: 'Hook name must start with capital letter'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"react"', weight: 10 }
          ],
          tags: ['hook', 'custom-hook', 'reusable'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'react-create-context',
          name: 'Create React Context',
          description: 'Create a new React context with provider',
          template: 'touch src/contexts/{context_name}Context.js && echo "import React, { createContext, useContext, useState } from \'react\';\n\nconst {context_name}Context = createContext();\n\nexport const use{context_name} = () => {\n  const context = useContext({context_name}Context);\n  if (!context) {\n    throw new Error(\'use{context_name} must be used within a {context_name}Provider\');\n  }\n  return context;\n};\n\nexport const {context_name}Provider = ({ children }) => {\n  const [value, setValue] = useState(null);\n  \n  return (\n    <{context_name}Context.Provider value={{ value, setValue }}>\n      {children}\n    </{context_name}Context.Provider>\n  );\n};" > src/contexts/{context_name}Context.js',
          category: 'React',
          variables: [
            {
              name: 'context_name',
              description: 'Context name (PascalCase)',
              defaultValue: 'MyContext',
              required: true,
              validation: {
                pattern: '^[A-Z][a-zA-Z0-9]*$',
                message: 'Context name must start with capital letter'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"react"', weight: 10 }
          ],
          tags: ['context', 'provider', 'state-management'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'react-start-dev',
          name: 'Start Development Server',
          description: 'Start the React development server',
          template: 'npm run dev',
          category: 'React',
          variables: [],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"react"', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"vite"', weight: 8 }
          ],
          tags: ['development', 'server', 'hot-reload'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'react-build-production',
          name: 'Build for Production',
          description: 'Create optimized production build',
          template: 'npm run build',
          category: 'React',
          variables: [],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"react"', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"scripts"', weight: 5 }
          ],
          tags: ['build', 'production', 'optimize'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'react-test-run',
          name: 'Run Tests',
          description: 'Execute React test suite',
          template: 'npm test',
          category: 'React',
          variables: [],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"react"', weight: 8 },
            { type: 'fileContains', path: 'package.json', pattern: '"jest"', weight: 6 }
          ],
          tags: ['testing', 'jest', 'unit-tests'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    },
    {
      name: 'Go',
      description: 'Go language development',
      icon: 'go',
      templates: [
        {
          id: 'go-mod-init',
          name: 'Initialize Go Module',
          description: 'Initialize a new Go module',
          template: 'go mod init {module_name}',
          category: 'Go',
          variables: [
            {
              name: 'module_name',
              description: 'Go module name (e.g., github.com/user/project)',
              defaultValue: 'github.com/user/project',
              required: true
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'go.mod', weight: 10 }
          ],
          tags: ['module', 'init', 'golang'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'go-run-main',
          name: 'Run Go Program',
          description: 'Run the main Go program',
          template: 'go run {main_file}',
          category: 'Go',
          variables: [
            {
              name: 'main_file',
              description: 'Main Go file (e.g., main.go, cmd/main.go)',
              defaultValue: 'main.go',
              required: true
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'go.mod', weight: 10 },
            { type: 'fileExists', path: 'main.go', weight: 8 }
          ],
          tags: ['run', 'main', 'golang'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'go-test-run',
          name: 'Run Go Tests',
          description: 'Execute Go test files',
          template: 'go test {test_path}',
          category: 'Go',
          variables: [
            {
              name: 'test_path',
              description: 'Test file or package path',
              defaultValue: './...',
              required: false
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'go.mod', weight: 10 }
          ],
          tags: ['testing', 'golang'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    },
    {
      name: 'Rust',
      description: 'Rust language development',
      icon: 'rust',
      templates: [
        {
          id: 'rust-new-project',
          name: 'Create New Rust Project',
          description: 'Create a new Rust project with Cargo',
          template: 'cargo new {project_name}',
          category: 'Rust',
          variables: [
            {
              name: 'project_name',
              description: 'Project name',
              defaultValue: 'my_rust_project',
              required: true
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'Cargo.toml', weight: 10 }
          ],
          tags: ['cargo', 'new', 'project'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'rust-build-release',
          name: 'Build Release Version',
          description: 'Build optimized release version',
          template: 'cargo build --release',
          category: 'Rust',
          variables: [],
          contextTriggers: [
            { type: 'fileExists', path: 'Cargo.toml', weight: 10 }
          ],
          tags: ['build', 'release', 'optimized'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'rust-run-tests',
          name: 'Run Rust Tests',
          description: 'Execute Rust test suite',
          template: 'cargo test',
          category: 'Rust',
          variables: [],
          contextTriggers: [
            { type: 'fileExists', path: 'Cargo.toml', weight: 10 }
          ],
          tags: ['testing', 'cargo'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    },
    {
      name: 'Vue',
      description: 'Vue.js development workflows',
      icon: 'vue',
      templates: [
        {
          id: 'vue-create-component',
          name: 'Create Vue Component',
          description: 'Create a new Vue single-file component',
          template: 'touch src/components/{component_name}.vue && echo "<template>\n  <div>\n    <h1>{{ title }}</h1>\n  </div>\n</template>\n\n<script setup>\nimport { ref } from \'vue\';\n\nconst title = ref(\'{component_name}\');\n</script>\n\n<style scoped>\n</style>" > src/components/{component_name}.vue',
          category: 'Vue',
          variables: [
            {
              name: 'component_name',
              description: 'Component name (PascalCase)',
              defaultValue: 'MyComponent',
              required: true,
              validation: {
                pattern: '^[A-Z][a-zA-Z0-9]*$',
                message: 'Component name must start with capital letter'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"vue"', weight: 10 }
          ],
          tags: ['component', 'sfc', 'frontend'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'vue-create-composable',
          name: 'Create Vue Composable',
          description: 'Create a new Vue composable function',
          template: 'touch src/composables/use{composable_name}.ts && echo "import { ref, computed } from \'vue\';\n\nexport function use{composable_name}() {\n  const data = ref(null);\n  \n  const processedData = computed(() => {\n    return data.value;\n  });\n  \n  return {\n    data,\n    processedData\n  };\n}" > src/composables/use{composable_name}.ts',
          category: 'Vue',
          variables: [
            {
              name: 'composable_name',
              description: 'Composable name (camelCase)',
              defaultValue: 'MyComposable',
              required: true,
              validation: {
                pattern: '^[a-z][a-zA-Z0-9]*$',
                message: 'Composable name must start with lowercase letter'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"vue"', weight: 10 }
          ],
          tags: ['composable', 'composition-api', 'reusable'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'vue-dev-server',
          name: 'Start Vue Dev Server',
          description: 'Start the Vue.js development server',
          template: 'npm run dev',
          category: 'Vue',
          variables: [],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"vue"', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"vite"', weight: 8 }
          ],
          tags: ['development', 'server', 'hot-reload'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'vue-build-production',
          name: 'Build for Production',
          description: 'Build optimized production bundle',
          template: 'npm run build',
          category: 'Vue',
          variables: [],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"vue"', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"scripts"', weight: 5 }
          ],
          tags: ['build', 'production', 'optimize'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    },
    {
      name: 'Angular',
      description: 'Angular development workflows',
      icon: 'angular',
      templates: [
        {
          id: 'angular-generate-component',
          name: 'Generate Angular Component',
          description: 'Generate a new Angular component with CLI',
          template: 'ng generate component {component_name}',
          category: 'Angular',
          variables: [
            {
              name: 'component_name',
              description: 'Component name (e.g., my-component)',
              defaultValue: 'my-component',
              required: true,
              validation: {
                pattern: '^[a-z][a-zA-Z0-9-]*$',
                message: 'Component name should be kebab-case'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'angular.json', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"@angular/cli"', weight: 8 }
          ],
          tags: ['component', 'generate', 'cli'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'angular-generate-service',
          name: 'Generate Angular Service',
          description: 'Generate a new Angular service with CLI',
          template: 'ng generate service {service_name}',
          category: 'Angular',
          variables: [
            {
              name: 'service_name',
              description: 'Service name (e.g., data)',
              defaultValue: 'data',
              required: true,
              validation: {
                pattern: '^[a-z][a-zA-Z0-9]*$',
                message: 'Service name should be camelCase'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'angular.json', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"@angular/cli"', weight: 8 }
          ],
          tags: ['service', 'generate', 'cli'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'angular-generate-module',
          name: 'Generate Angular Module',
          description: 'Generate a new Angular module with CLI',
          template: 'ng generate module {module_name}',
          category: 'Angular',
          variables: [
            {
              name: 'module_name',
              description: 'Module name (e.g., shared)',
              defaultValue: 'shared',
              required: true,
              validation: {
                pattern: '^[a-z][a-zA-Z0-9]*$',
                message: 'Module name should be camelCase'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'angular.json', weight: 10 },
            { type: 'fileContains', path: 'package.json', pattern: '"@angular/cli"', weight: 8 }
          ],
          tags: ['module', 'generate', 'cli'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'angular-serve-dev',
          name: 'Start Angular Dev Server',
          description: 'Start Angular development server',
          template: 'ng serve',
          category: 'Angular',
          variables: [],
          contextTriggers: [
            { type: 'fileExists', path: 'angular.json', weight: 10 }
          ],
          tags: ['serve', 'development', 'dev-server'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'angular-build-production',
          name: 'Build Angular Production',
          description: 'Build optimized Angular production bundle',
          template: 'ng build --prod',
          category: 'Angular',
          variables: [],
          contextTriggers: [
            { type: 'fileExists', path: 'angular.json', weight: 10 }
          ],
          tags: ['build', 'production', 'optimize'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    },
    {
      name: 'TypeScript',
      description: 'TypeScript development and compilation',
      icon: 'typescript',
      templates: [
        {
          id: 'typescript-compile',
          name: 'Compile TypeScript',
          description: 'Compile TypeScript files to JavaScript',
          template: 'npx tsc',
          category: 'TypeScript',
          variables: [],
          contextTriggers: [
            { type: 'fileExists', path: 'tsconfig.json', weight: 10 }
          ],
          tags: ['compile', 'tsc', 'transpile'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'typescript-check-types',
          name: 'Type Check Only',
          description: 'Run TypeScript type checking without emitting files',
          template: 'npx tsc --noEmit',
          category: 'TypeScript',
          variables: [],
          contextTriggers: [
            { type: 'fileExists', path: 'tsconfig.json', weight: 10 }
          ],
          tags: ['type-check', 'validate', 'no-emit'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'typescript-watch-mode',
          name: 'Watch Mode Compilation',
          description: 'Compile TypeScript in watch mode for development',
          template: 'npx tsc --watch',
          category: 'TypeScript',
          variables: [],
          contextTriggers: [
            { type: 'fileExists', path: 'tsconfig.json', weight: 10 }
          ],
          tags: ['watch', 'development', 'auto-compile'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'typescript-init-config',
          name: 'Initialize TypeScript Config',
          description: 'Create a new tsconfig.json file',
          template: 'npx tsc --init',
          category: 'TypeScript',
          variables: [],
          contextTriggers: [
            { type: 'fileContains', path: 'package.json', pattern: '"typescript"', weight: 8 }
          ],
          tags: ['config', 'init', 'setup'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'typescript-create-interface',
          name: 'Create TypeScript Interface',
          description: 'Create a new TypeScript interface file',
          template: 'touch src/types/{interface_name}.ts && echo "export interface {interface_name} {\n  id: string;\n  name: string;\n  // Add more properties as needed\n}" > src/types/{interface_name}.ts',
          category: 'TypeScript',
          variables: [
            {
              name: 'interface_name',
              description: 'Interface name (PascalCase)',
              defaultValue: 'MyInterface',
              required: true,
              validation: {
                pattern: '^[A-Z][a-zA-Z0-9]*$',
                message: 'Interface name must start with capital letter'
              }
            }
          ],
          contextTriggers: [
            { type: 'fileExists', path: 'tsconfig.json', weight: 8 },
            { type: 'fileContains', path: 'package.json', pattern: '"typescript"', weight: 6 }
          ],
          tags: ['interface', 'type', 'definition'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    }
  ];
}
