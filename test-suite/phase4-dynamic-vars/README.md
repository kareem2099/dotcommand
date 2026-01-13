# Phase 4: Dynamic Variables Testing

Tests the dynamic variable functionality for enhanced user experience.

## Git Branches Test (`git-branches-test/`)

**Test Project**: Git repository with multiple branches
- **Branches**: master, develop, feature-branch
- **Expected**: "Push Branch" template shows dropdown with actual branches
- **Current Branch**: Marked with "(current)" in dropdown

**Test Steps**:
1. Open project in VS Code
2. Run "Push Branch" template from suggestions
3. **Expected**: Quick pick shows `master (current)`, `develop`, `feature-branch`
4. Select a branch and verify correct command execution

## Package Dependencies Test (`package-deps-test/`)

**Test Project**: NPM project with various dependencies
- **Dependencies**: lodash, express, axios, moment
- **DevDependencies**: jest, typescript, eslint, @types/node
- **Expected**: "Install Package" template shows dropdown with all packages

**Test Steps**:
1. Open project in VS Code
2. Run "Install Package" template from suggestions
3. **Expected**: Quick pick shows all 8 packages (deps + devDeps)
4. Select a package and verify `npm install <package>` command

## File Picker Test (`file-picker-test/`)

**Test Project**: Project with config file
- **Files**: `config.json`, `README.md`, etc.
- **Expected**: Templates with file variables use VS Code file picker

**Test Steps**:
1. Create a template with file variable (requires manual test)
2. Run template that prompts for file selection
3. **Expected**: VS Code file picker dialog opens
4. Selected file path is inserted into command

## Dynamic Variable Types

### `git-branch` Type
- ✅ Scans actual Git branches
- ✅ Shows current branch indicator
- ✅ Falls back to text input for non-Git repos
- ✅ Caches results for 10 seconds

### `dropdown` Type
- ✅ Supports static options array
- ✅ Supports dynamic options (git-branches, package-deps, workspace-files)
- ✅ Uses VS Code Quick Pick UI
- ✅ Searchable and filterable

### `file` & `folder` Types
- ✅ Uses VS Code native file/folder dialogs
- ✅ Returns workspace-relative paths
- ✅ Proper file vs folder filtering

### `package` Type
- ✅ Parses package.json dependencies
- ✅ Combines regular + dev dependencies
- ✅ Alphabetically sorted
- ✅ Quick pick with search

## Expected Results

- ✅ All dynamic variables work without manual typing
- ✅ Fallback to text input when dynamic sources unavailable
- ✅ No performance issues with large option lists
- ✅ Proper error handling for missing files/context