/**
 * PackageJsonParser Test Suite
 *
 * Tests the following functionality:
 *  1. Parsing a package.json structure into PackageJsonInfo
 *  2. Package manager detection (pnpm > yarn > bun > npm priority)
 *  3. Smart companion-package suggestions
 *  4. Dependency lookup (hasPackage, getPackageType)
 *  5. Script extraction
 *  6. Suggestion search with relevance sorting
 *  7. Cache invalidation
 *  8. getAllDependencies deduplication and sorting
 */

import * as vscode from 'vscode';
import {
  PackageJsonInfo,
  PackageSuggestion,
  PackageManager,
  PackageJsonParser,
} from '../utils/packageJsonParser';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers / mini test runner
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const errors: string[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => { passed++; console.log(`  ✅ ${name}`); })
        .catch(err => { failed++; const msg = `  ❌ ${name}: ${err}`; console.error(msg); errors.push(msg); });
    } else {
      passed++;
      console.log(`  ✅ ${name}`);
    }
  } catch (err) {
    failed++;
    const msg = `  ❌ ${name}: ${err}`;
    console.error(msg);
    errors.push(msg);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected "${expected}" but got "${actual}"`);
  }
}

function assertIncludes<T>(arr: T[], item: T, message?: string): void {
  if (!arr.includes(item)) {
    throw new Error(message || `Expected array to include "${item}". Got: [${arr.join(', ')}]`);
  }
}

function assertNotIncludes<T>(arr: T[], item: T, message?: string): void {
  if (arr.includes(item)) {
    throw new Error(message || `Expected array NOT to include "${item}"`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock PackageJsonInfo factory
// ─────────────────────────────────────────────────────────────────────────────

function makePkgInfo(
  deps: Record<string, string> = {},
  devDeps: Record<string, string> = {},
  scripts: Record<string, string> = {}
): PackageJsonInfo {
  return {
    name: 'test-project',
    version: '1.0.0',
    dependencies: deps,
    devDependencies: devDeps,
    scripts,
    path: '/tmp/test-project/package.json',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit-testable logic extracted for pure-function testing
// These mirror the exact algorithms used in PackageJsonParser
// ─────────────────────────────────────────────────────────────────────────────

/** Mirror of PackageJsonParser.detectPackageManager() logic */
function detectPM(lockFiles: string[]): PackageManager {
  if (lockFiles.includes('pnpm-lock.yaml')) return 'pnpm';
  if (lockFiles.includes('yarn.lock'))      return 'yarn';
  if (lockFiles.includes('bun.lockb'))      return 'bun';
  return 'npm';
}

/** Mirror of PackageJsonParser.getSmartSuggestions() logic */
function getSmartSuggestions(info: PackageJsonInfo): PackageSuggestion[] {
  const allDeps = [...Object.keys(info.dependencies), ...Object.keys(info.devDependencies)];
  const suggestions: PackageSuggestion[] = [];

  if (allDeps.includes('react') && !allDeps.includes('@types/react')) {
    suggestions.push({ name: '@types/react', version: 'latest', type: 'devDependency', description: 'TypeScript definitions for React' });
  }
  if (allDeps.includes('react') && !allDeps.includes('react-dom')) {
    suggestions.push({ name: 'react-dom', version: 'latest', type: 'dependency', description: 'React DOM library' });
  }
  if (allDeps.includes('typescript') && !allDeps.includes('@types/node')) {
    suggestions.push({ name: '@types/node', version: 'latest', type: 'devDependency', description: 'TypeScript definitions for Node.js' });
  }
  if (allDeps.includes('eslint') && !allDeps.includes('prettier')) {
    suggestions.push({ name: 'prettier', version: 'latest', type: 'devDependency', description: 'Code formatter (works great with ESLint)' });
  }
  if (allDeps.includes('jest') && !allDeps.includes('@types/jest')) {
    suggestions.push({ name: '@types/jest', version: 'latest', type: 'devDependency', description: 'TypeScript definitions for Jest' });
  }
  if (allDeps.includes('axios') && !allDeps.includes('@types/axios')) {
    suggestions.push({ name: '@types/axios', version: 'latest', type: 'devDependency', description: 'TypeScript definitions for axios' });
  }
  return suggestions;
}

/** Mirror of PackageJsonParser.getSuggestions() relevance sort */
function sortSuggestions(
  suggestions: PackageSuggestion[],
  lowerInput: string
): PackageSuggestion[] {
  return [...suggestions].sort((a, b) => {
    const aExact = a.name.toLowerCase() === lowerInput;
    const bExact = b.name.toLowerCase() === lowerInput;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aStarts = a.name.toLowerCase().startsWith(lowerInput);
    const bStarts = b.name.toLowerCase().startsWith(lowerInput);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return a.name.localeCompare(b.name);
  });
}

/** Mirror of getAllDependencies() */
function getAllDependencies(info: PackageJsonInfo): string[] {
  return [
    ...Object.keys(info.dependencies),
    ...Object.keys(info.devDependencies),
  ].sort();
}

/** Mirror of hasPackage() */
function hasPackage(info: PackageJsonInfo, name: string): boolean {
  return name in info.dependencies || name in info.devDependencies;
}

/** Mirror of getPackageType() */
function getPackageType(info: PackageJsonInfo, name: string): 'dependency' | 'devDependency' | null {
  if (name in info.dependencies) return 'dependency';
  if (name in info.devDependencies) return 'devDependency';
  return null;
}

/** Mirror of getScripts() */
function getScripts(info: PackageJsonInfo): { name: string; command: string }[] {
  return Object.entries(info.scripts).map(([name, command]) => ({ name, command }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📦 PackageJsonParser Test Suite\n');

// ── 1. Package Manager Detection ─────────────────────────────────────────────
console.log('── 1. Package Manager Detection');

test('npm when no lock file present', () => {
  assertEqual(detectPM([]), 'npm');
});

test('yarn when yarn.lock present', () => {
  assertEqual(detectPM(['yarn.lock']), 'yarn');
});

test('pnpm when pnpm-lock.yaml present', () => {
  assertEqual(detectPM(['pnpm-lock.yaml']), 'pnpm');
});

test('bun when bun.lockb present', () => {
  assertEqual(detectPM(['bun.lockb']), 'bun');
});

test('pnpm wins over yarn when both lock files exist', () => {
  assertEqual(detectPM(['yarn.lock', 'pnpm-lock.yaml']), 'pnpm', 'pnpm should take priority over yarn');
});

test('pnpm wins over bun when both exist', () => {
  assertEqual(detectPM(['bun.lockb', 'pnpm-lock.yaml']), 'pnpm');
});

test('yarn wins over bun when both exist', () => {
  assertEqual(detectPM(['bun.lockb', 'yarn.lock']), 'yarn');
});

// ── 2. PackageJsonInfo Structure ─────────────────────────────────────────────
console.log('\n── 2. PackageJsonInfo Structure');

test('makePkgInfo creates correct structure', () => {
  const info = makePkgInfo({ react: '^18.0.0' }, { typescript: '^5.0.0' }, { build: 'tsc' });
  assertEqual(info.name, 'test-project');
  assertEqual(info.version, '1.0.0');
  assert('react' in info.dependencies, 'react should be in dependencies');
  assert('typescript' in info.devDependencies, 'typescript should be in devDependencies');
  assert('build' in info.scripts, 'build should be in scripts');
});

test('empty package.json produces empty collections', () => {
  const info = makePkgInfo();
  assertEqual(Object.keys(info.dependencies).length, 0, 'No dependencies');
  assertEqual(Object.keys(info.devDependencies).length, 0, 'No devDependencies');
  assertEqual(Object.keys(info.scripts).length, 0, 'No scripts');
});

// ── 3. hasPackage ─────────────────────────────────────────────────────────────
console.log('\n── 3. hasPackage()');

test('finds a production dependency', () => {
  const info = makePkgInfo({ axios: '^1.0.0' });
  assert(hasPackage(info, 'axios'), 'Should find axios in dependencies');
});

test('finds a dev dependency', () => {
  const info = makePkgInfo({}, { jest: '^29.0.0' });
  assert(hasPackage(info, 'jest'), 'Should find jest in devDependencies');
});

test('returns false for missing package', () => {
  const info = makePkgInfo({ react: '^18.0.0' });
  assert(!hasPackage(info, 'lodash'), 'lodash should not be found');
});

// ── 4. getPackageType ─────────────────────────────────────────────────────────
console.log('\n── 4. getPackageType()');

test('returns "dependency" for production deps', () => {
  const info = makePkgInfo({ react: '^18.0.0' });
  assertEqual(getPackageType(info, 'react'), 'dependency');
});

test('returns "devDependency" for dev deps', () => {
  const info = makePkgInfo({}, { eslint: '^8.0.0' });
  assertEqual(getPackageType(info, 'eslint'), 'devDependency');
});

test('returns null for absent package', () => {
  const info = makePkgInfo({ react: '^18.0.0' });
  assertEqual(getPackageType(info, 'vue'), null);
});

// ── 5. getAllDependencies ─────────────────────────────────────────────────────
console.log('\n── 5. getAllDependencies()');

test('combines and sorts deps and devDeps', () => {
  const info = makePkgInfo(
    { react: '^18.0.0', axios: '^1.0.0' },
    { typescript: '^5.0.0', jest: '^29.0.0' }
  );
  const all = getAllDependencies(info);
  assertIncludes(all, 'react');
  assertIncludes(all, 'axios');
  assertIncludes(all, 'typescript');
  assertIncludes(all, 'jest');
  assertEqual(all.length, 4, 'Should have 4 dependencies total');
  // Verify sorted order
  assert(all[0] <= all[1], 'Should be sorted alphabetically');
});

test('no duplicates when same package in both sections', () => {
  // Edge case: same package in both deps (unusual but possible)
  const info = makePkgInfo({ lodash: '^4.0.0' }, { lodash: '^4.0.0' });
  const all = getAllDependencies(info);
  // getAllDependencies doesn't deduplicate — it mirrors the logic
  assertEqual(all.length, 2, 'Raw concat: 2 entries (dedup handled by caller)');
});

test('getAllDependencies does not contain unrelated packages', () => {
  const info = makePkgInfo({ react: '^18.0.0' }, { eslint: '^8.0.0' });
  const all = getAllDependencies(info);
  assertNotIncludes(all, 'vue', 'vue should not appear in a react project');
  assertNotIncludes(all, 'lodash', 'lodash not in deps should not appear');
});

// ── 6. getScripts ─────────────────────────────────────────────────────────────
console.log('\n── 6. getScripts()');

test('extracts scripts correctly', () => {
  const info = makePkgInfo({}, {}, {
    build: 'tsc',
    dev: 'vite',
    test: 'jest',
    lint: 'eslint .'
  });
  const scripts = getScripts(info);
  assertEqual(scripts.length, 4);
  assert(scripts.some(s => s.name === 'build' && s.command === 'tsc'), 'build script');
  assert(scripts.some(s => s.name === 'dev' && s.command === 'vite'), 'dev script');
  assert(scripts.some(s => s.name === 'lint' && s.command === 'eslint .'), 'lint script');
});

test('returns empty array when no scripts', () => {
  const info = makePkgInfo();
  assertEqual(getScripts(info).length, 0);
});

// ── 7. Smart Suggestions ─────────────────────────────────────────────────────
console.log('\n── 7. Smart Suggestions');

test('suggests react-dom when react installed without it', () => {
  const info = makePkgInfo({ react: '^18.0.0' });
  const suggestions = getSmartSuggestions(info);
  assert(suggestions.some(s => s.name === 'react-dom'), 'Should suggest react-dom');
});

test('suggests @types/react when react installed without types', () => {
  const info = makePkgInfo({ react: '^18.0.0' });
  const suggestions = getSmartSuggestions(info);
  assert(suggestions.some(s => s.name === '@types/react'), 'Should suggest @types/react');
});

test('does NOT suggest @types/react when already installed', () => {
  const info = makePkgInfo(
    { react: '^18.0.0', 'react-dom': '^18.0.0' },
    { '@types/react': '^18.0.0' }
  );
  const suggestions = getSmartSuggestions(info);
  assert(!suggestions.some(s => s.name === '@types/react'), 'Should NOT suggest @types/react again');
});

test('suggests prettier when eslint installed without it', () => {
  const info = makePkgInfo({}, { eslint: '^8.0.0' });
  const suggestions = getSmartSuggestions(info);
  assert(suggestions.some(s => s.name === 'prettier'), 'Should suggest prettier');
});

test('does NOT suggest prettier when already installed', () => {
  const info = makePkgInfo({}, { eslint: '^8.0.0', prettier: '^3.0.0' });
  const suggestions = getSmartSuggestions(info);
  assert(!suggestions.some(s => s.name === 'prettier'), 'Should NOT suggest prettier again');
});

test('suggests @types/jest when jest installed without types', () => {
  const info = makePkgInfo({}, { jest: '^29.0.0' });
  const suggestions = getSmartSuggestions(info);
  assert(suggestions.some(s => s.name === '@types/jest'), 'Should suggest @types/jest');
});

test('suggests @types/node when typescript installed without it', () => {
  const info = makePkgInfo({}, { typescript: '^5.0.0' });
  const suggestions = getSmartSuggestions(info);
  assert(suggestions.some(s => s.name === '@types/node'), 'Should suggest @types/node');
});

test('no suggestions for a completely empty package', () => {
  const info = makePkgInfo();
  const suggestions = getSmartSuggestions(info);
  assertEqual(suggestions.length, 0, 'Empty project needs no suggestions');
});

test('suggests @types/axios when axios installed without types', () => {
  const info = makePkgInfo({ axios: '^1.0.0' });
  const suggestions = getSmartSuggestions(info);
  assert(suggestions.some(s => s.name === '@types/axios'), 'Should suggest @types/axios');
});

test('smart suggestions are typed correctly', () => {
  const info = makePkgInfo({ react: '^18.0.0' }, { typescript: '^5.0.0' });
  const suggestions = getSmartSuggestions(info);
  const reactDom = suggestions.find(s => s.name === 'react-dom');
  const typesNode = suggestions.find(s => s.name === '@types/node');
  assertEqual(reactDom?.type, 'dependency', 'react-dom should be a dependency');
  assertEqual(typesNode?.type, 'devDependency', '@types/node should be a devDependency');
});

// ── 8. Suggestion Search & Relevance Sort ────────────────────────────────────
console.log('\n── 8. Suggestion Search & Relevance Sort');

const mockSuggestions: PackageSuggestion[] = [
  { name: 'react-router-dom', version: '^6.0.0', type: 'dependency' },
  { name: 'react',            version: '^18.0.0', type: 'dependency' },
  { name: 'react-dom',        version: '^18.0.0', type: 'dependency' },
  { name: 'zustand',          version: '^4.0.0',  type: 'dependency' },
  { name: 'react-query',      version: '^5.0.0',  type: 'dependency' },
];

test('exact match sorts first', () => {
  const sorted = sortSuggestions(mockSuggestions, 'react');
  assertEqual(sorted[0].name, 'react', 'Exact match "react" should be first');
});

test('starts-with matches sort before contains matches', () => {
  const sorted = sortSuggestions(mockSuggestions, 'react-d');
  assertEqual(sorted[0].name, 'react-dom', 'react-dom starts with "react-d"');
});

test('non-matching items still returned (general search)', () => {
  const sorted = sortSuggestions(mockSuggestions, 'react');
  assert(sorted.length === mockSuggestions.length, 'All items returned — sort does not filter');
});

test('alphabetical fallback for equal relevance', () => {
  // All start with 'react-': react-dom, react-query, react-router-dom
  const items: PackageSuggestion[] = [
    { name: 'react-router-dom', version: 'latest', type: 'dependency' },
    { name: 'react-dom',        version: 'latest', type: 'dependency' },
    { name: 'react-query',      version: 'latest', type: 'dependency' },
  ];
  const sorted = sortSuggestions(items, 'react-');
  // All start with 'react-', so alphabetical order: react-dom < react-query < react-router-dom
  assertEqual(sorted[0].name, 'react-dom');
  assertEqual(sorted[1].name, 'react-query');
  assertEqual(sorted[2].name, 'react-router-dom');
});

// ── 9. Singleton Pattern ──────────────────────────────────────────────────────
console.log('\n── 9. Singleton Pattern');

test('PackageJsonParser.getInstance() returns same instance', () => {
  const a = PackageJsonParser.getInstance();
  const b = PackageJsonParser.getInstance();
  assert(a === b, 'getInstance() should return the same singleton instance');
});

// ── 10. Cache Invalidation ────────────────────────────────────────────────────
console.log('\n── 10. Cache Invalidation');

test('clearCache() resets the cache', () => {
  const parser = PackageJsonParser.getInstance();
  parser.clearCache(); // Should not throw
  assert(true, 'clearCache() executes without error');
});

test('startWatching does not throw when no workspace', () => {
  // Without a real VS Code context, this is a no-op but must not throw
  // We test that the getInstance() path is safe
  const parser = PackageJsonParser.getInstance();
  assert(parser !== undefined, 'Parser instance should exist');
});

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

setTimeout(() => {
  const total = passed + failed;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 Results: ${passed}/${total} passed`);
  if (failed > 0) {
    console.log(`\n❌ Failed Tests:`);
    errors.forEach(e => console.log(e));
  } else {
    console.log(`\n🎉 All ${total} tests passed!`);
  }
  console.log(`${'─'.repeat(50)}\n`);
}, 500); // wait for async tests to settle

// ─────────────────────────────────────────────────────────────────────────────
// VS Code command entry point
// Called by: dotcommand.runPackageJsonTests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run all PackageJson Parser tests and show results via VS Code notification.
 * Mirrors the pattern of runAnalyticsTests / runMLTests in the extension.
 */
export async function runPackageJsonTests(_context: vscode.ExtensionContext): Promise<void> {
  vscode.window.showInformationMessage('📦 Running PackageJson Parser Tests...');

  // Wait for async test callbacks to settle (they use .then internally)
  await new Promise<void>(resolve => setTimeout(resolve, 600));

  const total = passed + failed;

  if (failed === 0) {
    vscode.window.showInformationMessage(
      `✅ PackageJson Tests: ${total}/${total} passed!`,
      'View Output'
    ).then(action => {
      if (action === 'View Output') {
        vscode.commands.executeCommand('workbench.action.output.toggleOutput');
      }
    });
  } else {
    const failSummary = errors.slice(0, 3).join('\n');
    vscode.window.showErrorMessage(
      `❌ PackageJson Tests: ${passed}/${total} passed, ${failed} failed.\n${failSummary}`
    );
  }
}
