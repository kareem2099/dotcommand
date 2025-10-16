#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Generate default basic tasks for new users
 */
function generateDefaultTasks() {
  const defaultTasks = {
    "version": "1.0.0",
    "preparedTasks": [
      // Build Tasks
      {
        "label": "Build Project",
        "command": "npm run build",
        "description": "Build the project for production",
        "category": "Build"
      },
      {
        "label": "Production Build",
        "command": "npm run prod",
        "description": "Create optimized production build",
        "category": "Build"
      },
      {
        "label": "Alternative Prod Build",
        "command": "npm run production",
        "description": "Alternative production build command",
        "category": "Build"
      },

      // Development Tasks
      {
        "label": "Start Development",
        "command": "npm run dev",
        "description": "Start the development server",
        "category": "Development"
      },
      {
        "label": "Start Production Server",
        "command": "npm start",
        "description": "Start the production server",
        "category": "Development"
      },
      {
        "label": "Watch Mode",
        "command": "npm run watch",
        "description": "Watch files and rebuild on changes",
        "category": "Development"
      },
      {
        "label": "Serve Built App",
        "command": "npm run serve",
        "description": "Serve the built application locally",
        "category": "Development"
      },

      // Testing Tasks
      {
        "label": "Run Tests",
        "command": "npm run test",
        "description": "Run the test suite",
        "category": "Testing"
      },
      {
        "label": "Watch Tests",
        "command": "npm run test:watch",
        "description": "Run tests in watch mode",
        "category": "Testing"
      },
      {
        "label": "Unit Tests",
        "command": "npm run test:unit",
        "description": "Run unit tests only",
        "category": "Testing"
      },
      {
        "label": "Integration Tests",
        "command": "npm run test:integration",
        "description": "Run integration tests",
        "category": "Testing"
      },
      {
        "label": "E2E Tests",
        "command": "npm run test:e2e",
        "description": "Run end-to-end tests",
        "category": "Testing"
      },
      {
        "label": "Test Coverage",
        "command": "npm run coverage",
        "description": "Generate test coverage report",
        "category": "Testing"
      },

      // Code Quality Tasks
      {
        "label": "Lint Code",
        "command": "npm run lint",
        "description": "Check code quality and style",
        "category": "Code Quality"
      },
      {
        "label": "Format Code",
        "command": "npm run format",
        "description": "Format code with formatter (prettier/eslint)",
        "category": "Code Quality"
      },
      {
        "label": "Type Check",
        "command": "npm run type-check",
        "description": "Run TypeScript type checking",
        "category": "Code Quality"
      },
      {
        "label": "Alternative Type Check",
        "command": "npm run type:check",
        "description": "Alternative TypeScript check command",
        "category": "Code Quality"
      },

      // Project Management Tasks
      {
        "label": "Install Dependencies",
        "command": "npm install",
        "description": "Install all project dependencies",
        "category": "Project Management"
      },
      {
        "label": "Clean Project",
        "command": "npm run clean",
        "description": "Clean build artifacts and cache",
        "category": "Project Management"
      },
      {
        "label": "Audit Fix",
        "command": "npm audit fix",
        "description": "Fix security vulnerabilities",
        "category": "Project Management"
      },
      {
        "label": "Check Outdated",
        "command": "npm outdated",
        "description": "Check for outdated dependencies",
        "category": "Project Management"
      },
      {
        "label": "Pre-commit Hooks",
        "command": "npm run pre-commit",
        "description": "Run pre-commit hooks",
        "category": "Project Management"
      },

      // Special Framework Tasks
      {
        "label": "Storybook",
        "command": "npm run storybook",
        "description": "Start Storybook development server",
        "category": "Development"
      },

      // Git Tasks
      {
        "label": "Git Status",
        "command": "git status",
        "description": "Check git repository status",
        "category": "Version Control"
      },
      {
        "label": "Git Add All",
        "command": "git add .",
        "description": "Stage all changes for commit",
        "category": "Version Control"
      },
      {
        "label": "Git Commit",
        "command": "git commit -m \"updates\"",
        "description": "Commit staged changes",
        "category": "Version Control"
      },
      {
        "label": "Git Push",
        "command": "git push origin main",
        "description": "Push changes to remote repository",
        "category": "Version Control"
      },

      // Docker Tasks
      {
        "label": "Docker Build",
        "command": "docker build -t app .",
        "description": "Build Docker image from Dockerfile",
        "category": "Containerization"
      },
      {
        "label": "Docker Run",
        "command": "docker run -p 3000:3000 app",
        "description": "Run the Docker container",
        "category": "Containerization"
      }
    ]
  };

  const tasksFilePath = path.join(__dirname, '..', 'tasksDotcommand.json');
  const tasksJson = JSON.stringify(defaultTasks, null, 2);

  // Only create if file doesn't exist or is empty
  if (!fs.existsSync(tasksFilePath) || fs.readFileSync(tasksFilePath, 'utf8').trim() === '') {
    fs.writeFileSync(tasksFilePath, tasksJson, 'utf8');
    console.log('✅ Generated default tasks.dotcommand with basic tasks');
  } else {
    console.log('ℹ️  tasks.dotcommand already exists, skipping generation');
  }
}

// Run the generator
generateDefaultTasks();
