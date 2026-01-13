# Phase 2: Template Context Testing

Tests Smart Context Awareness template suggestions for different technology stacks.

## Test Projects

### NPM Project (`npm-project/`)
- **File**: `package.json` with dependencies and scripts
- **Expected**: NPM templates appear (Install Package, Run Script)
- **Relevance Score**: High (weight: 10)

### Docker Project (`docker-project/`)
- **File**: `Dockerfile` with Node.js application
- **Expected**: Docker templates appear (Build Image, Run with Port)
- **Relevance Score**: High (weight: 10)

### Git Project (`git-project/`)
- **Initialized**: Git repository with initial commit
- **Expected**: Git templates appear (Commit, Push Branch, Create Branch)
- **Relevance Score**: High (weight: 10)

### Python Project (`python-project/`)
- **File**: `requirements.txt` with Flask, pytest, etc.
- **Expected**: Python templates appear (Create Venv, Install Requirements, Run Tests)
- **Relevance Score**: High (weight: 8)

### Go Project (`go-project/`)
- **File**: `go.mod` with Gin framework
- **Expected**: Go templates appear (Run Program, Run Tests, Initialize Module)
- **Relevance Score**: High (weight: 10)

### React Project (`react-project/`)
- **File**: `package.json` with React dependencies
- **Expected**: React templates appear (Create Component, Start Dev Server)
- **Relevance Score**: High (weight: 10)

### Vue Project (`vue-project/`)
- **File**: `package.json` with Vue dependencies
- **Expected**: Vue templates appear (Create Component, Start Dev Server)
- **Relevance Score**: High (weight: 10)

## Test Procedure

1. **Open each project** in VS Code
2. **Check Tree View**: Look for "⚡ Suggested for Workspace" section
3. **Check Template Manager**: Open and verify suggestions
4. **Verify Relevance**: Check that scores match expectations
5. **Test Execution**: Try running suggested templates

## Expected Results

- Each project shows relevant technology templates
- Templates have appropriate relevance scores
- No irrelevant templates appear
- Suggestions update when switching between projects