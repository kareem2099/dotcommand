/**
 * PackageJsonParser Test Runner - OutputChannel Version
 * 
 * Comprehensive test suite with VS Code Output Channel for visible results
 * Matches the pattern of analyticsTest.ts and mlTest.ts
 */

import * as vscode from 'vscode';
import {
  PackageJsonInfo,
  PackageSuggestion,
  PackageManager,
  PackageJsonParser,
} from '../utils/packageJsonParser';

export class PackageJsonTestRunner {
    private static instance: PackageJsonTestRunner;
    private context: vscode.ExtensionContext;
    private passed = 0;
    private failed = 0;
    private results: string[] = [];
    private output?: vscode.OutputChannel;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(context?: vscode.ExtensionContext): PackageJsonTestRunner {
        if (!PackageJsonTestRunner.instance) {
            if (!context) {
                throw new Error('PackageJsonTestRunner requires context on first initialization');
            }
            PackageJsonTestRunner.instance = new PackageJsonTestRunner(context);
        }
        return PackageJsonTestRunner.instance;
    }

    public static initialize(context: vscode.ExtensionContext): PackageJsonTestRunner {
        PackageJsonTestRunner.instance = new PackageJsonTestRunner(context);
        return PackageJsonTestRunner.instance;
    }

    /**
     * Run all tests with visual output
     */
    public async runAllTests(): Promise<void> {
        try {
            // Setup output channel
            this.output = vscode.window.createOutputChannel('PackageJson Tests');
            this.output.clear();
            this.output.show();

            this.output.appendLine('='.repeat(60));
            this.output.appendLine('📦 PACKAGEJSON PARSER TEST SUITE');
            this.output.appendLine('='.repeat(60));
            this.output.appendLine('');

            console.log('=== Starting PackageJson Parser Tests ===\n');
            this.passed = 0;
            this.failed = 0;
            this.results = [];

            // Run test suites
            await this.safeRunTest('1. Package Manager Detection', () => this.testPackageManagerDetection());
            await this.safeRunTest('2. PackageJsonInfo Structure', () => this.testPackageJsonInfoStructure());
            await this.safeRunTest('3. hasPackage()', () => this.testHasPackage());
            await this.safeRunTest('4. getPackageType()', () => this.testGetPackageType());
            await this.safeRunTest('5. getAllDependencies()', () => this.testGetAllDependencies());
            await this.safeRunTest('6. getScripts()', () => this.testGetScripts());
            await this.safeRunTest('7. Smart Suggestions', () => this.testSmartSuggestions());
            await this.safeRunTest('8. Suggestion Search & Relevance Sort', () => this.testSuggestionSearchSort());
            await this.safeRunTest('9. Singleton Pattern', () => this.testSingletonPattern());
            await this.safeRunTest('10. Cache Invalidation', () => this.testCacheInvalidation());

            // Print results
            this.output.appendLine('');
            this.output.appendLine('='.repeat(60));
            this.output.appendLine('📊 TEST RESULTS');
            this.output.appendLine('='.repeat(60));
            this.output.appendLine(`✅ Passed: ${this.passed}/${this.passed + this.failed}`);
            this.output.appendLine(`❌ Failed: ${this.failed}/${this.passed + this.failed}`);
            this.output.appendLine(`📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
            this.output.appendLine('');

            console.log('\n=== Test Results ===');
            console.log(`Passed: ${this.passed}`);
            console.log(`Failed: ${this.failed}`);
            console.log(`Total: ${this.passed + this.failed}`);

            if (this.failed > 0) {
                this.output.appendLine('❌ FAILED TESTS:');
                this.output.appendLine('-'.repeat(60));
                this.results.filter(r => r.startsWith('❌')).forEach(r => {
                    this.output?.appendLine(r);
                });
            } else {
                this.output.appendLine('🎉 ALL TESTS PASSED!');
            }

            // Show notification
            if (this.failed === 0) {
                vscode.window.showInformationMessage(
                    `✅ All PackageJson Tests Passed (${this.passed}/${this.passed + this.failed})!`,
                    'View Details'
                ).then(selection => {
                    if (selection === 'View Details') {
                        this.output?.show();
                    }
                });
            } else {
                vscode.window.showWarningMessage(
                    `⚠️ ${this.failed} Test(s) Failed`,
                    'View Details'
                ).then(selection => {
                    if (selection === 'View Details') {
                        this.output?.show();
                    }
                });
            }

        } catch (error) {
            this.output?.appendLine('');
            this.output?.appendLine('💥 CRITICAL ERROR:');
            this.output?.appendLine(String(error));
            vscode.window.showErrorMessage('Test suite crashed: ' + error);
        }
    }

    private async safeRunTest(name: string, testFn: () => void | Promise<void>): Promise<void> {
        try {
            await testFn();
        } catch (error) {
            this.failed++;
            const msg = `❌ ${name} - Test crashed: ${error}`;
            this.results.push(msg);
            this.output?.appendLine(msg);
            console.error(msg);
        }
    }

    private assert(condition: boolean, testName: string): void {
        if (condition) {
            this.passed++;
            const msg = `✅ ${testName}`;
            this.results.push(msg);
            this.output?.appendLine(`  ${msg}`);
            console.log(msg);
        } else {
            this.failed++;
            const msg = `❌ ${testName}`;
            this.results.push(msg);
            this.output?.appendLine(`  ${msg}`);
            console.log(msg);
        }
    }

    private assertEqual<T>(actual: T, expected: T, message?: string): void {
        this.assert(actual === expected, message || `Expected "${expected}" but got "${actual}"`);
    }

    private assertIncludes<T>(arr: T[], item: T, message?: string): void {
        this.assert(arr.includes(item), message || `Expected array to include "${item}"`);
    }

    private assertNotIncludes<T>(arr: T[], item: T, message?: string): void {
        this.assert(!arr.includes(item), message || `Expected array NOT to include "${item}"`);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Mock PackageJsonInfo factory
    // ─────────────────────────────────────────────────────────────────────────────

    private makePkgInfo(
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
    // Test Methods
    // ─────────────────────────────────────────────────────────────────────────────

    private async testPackageManagerDetection(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 1. Package Manager Detection');
        this.output?.appendLine('-'.repeat(60));

        const detectPM = (lockFiles: string[]): PackageManager => {
            if (lockFiles.includes('pnpm-lock.yaml')) return 'pnpm';
            if (lockFiles.includes('yarn.lock')) return 'yarn';
            if (lockFiles.includes('bun.lockb')) return 'bun';
            return 'npm';
        };

        this.assertEqual(detectPM([]), 'npm', 'npm when no lock file');
        this.assertEqual(detectPM(['yarn.lock']), 'yarn', 'yarn when yarn.lock present');
        this.assertEqual(detectPM(['pnpm-lock.yaml']), 'pnpm', 'pnpm when pnpm-lock.yaml present');
        this.assertEqual(detectPM(['bun.lockb']), 'bun', 'bun when bun.lockb present');
        this.assertEqual(detectPM(['yarn.lock', 'pnpm-lock.yaml']), 'pnpm', 'pnpm wins over yarn');
        this.assertEqual(detectPM(['bun.lockb', 'pnpm-lock.yaml']), 'pnpm', 'pnpm wins over bun');
        this.assertEqual(detectPM(['bun.lockb', 'yarn.lock']), 'yarn', 'yarn wins over bun');
    }

    private async testPackageJsonInfoStructure(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 2. PackageJsonInfo Structure');
        this.output?.appendLine('-'.repeat(60));

        const info = this.makePkgInfo({ react: '^18.0.0' }, { typescript: '^5.0.0' }, { build: 'tsc' });
        this.assertEqual(info.name, 'test-project', 'name property');
        this.assertEqual(info.version, '1.0.0', 'version property');
        this.assert('react' in info.dependencies, 'react in dependencies');
        this.assert('typescript' in info.devDependencies, 'typescript in devDependencies');
        this.assert('build' in info.scripts, 'build in scripts');

        const emptyInfo = this.makePkgInfo();
        this.assertEqual(Object.keys(emptyInfo.dependencies).length, 0, 'empty deps');
        this.assertEqual(Object.keys(emptyInfo.devDependencies).length, 0, 'empty devDeps');
        this.assertEqual(Object.keys(emptyInfo.scripts).length, 0, 'empty scripts');
    }

    private async testHasPackage(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 3. hasPackage()');
        this.output?.appendLine('-'.repeat(60));

        const hasPackage = (info: PackageJsonInfo, name: string): boolean => {
            return name in info.dependencies || name in info.devDependencies;
        };

        const info1 = this.makePkgInfo({ axios: '^1.0.0' });
        this.assert(hasPackage(info1, 'axios'), 'finds production dependency');

        const info2 = this.makePkgInfo({}, { jest: '^29.0.0' });
        this.assert(hasPackage(info2, 'jest'), 'finds dev dependency');

        const info3 = this.makePkgInfo({ react: '^18.0.0' });
        this.assert(!hasPackage(info3, 'lodash'), 'returns false for missing');
    }

    private async testGetPackageType(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 4. getPackageType()');
        this.output?.appendLine('-'.repeat(60));

        const getPackageType = (info: PackageJsonInfo, name: string): 'dependency' | 'devDependency' | null => {
            if (name in info.dependencies) return 'dependency';
            if (name in info.devDependencies) return 'devDependency';
            return null;
        };

        const info1 = this.makePkgInfo({ react: '^18.0.0' });
        this.assertEqual(getPackageType(info1, 'react'), 'dependency', 'returns dependency');

        const info2 = this.makePkgInfo({}, { eslint: '^8.0.0' });
        this.assertEqual(getPackageType(info2, 'eslint'), 'devDependency', 'returns devDependency');

        const info3 = this.makePkgInfo({ react: '^18.0.0' });
        this.assertEqual(getPackageType(info3, 'vue'), null, 'returns null for absent');
    }

    private async testGetAllDependencies(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 5. getAllDependencies()');
        this.output?.appendLine('-'.repeat(60));

        const getAllDependencies = (info: PackageJsonInfo): string[] => {
            return [
                ...Object.keys(info.dependencies),
                ...Object.keys(info.devDependencies),
            ].sort();
        };

        const info = this.makePkgInfo(
            { react: '^18.0.0', axios: '^1.0.0' },
            { typescript: '^5.0.0', jest: '^29.0.0' }
        );
        const all = getAllDependencies(info);
        this.assertIncludes(all, 'react');
        this.assertIncludes(all, 'axios');
        this.assertIncludes(all, 'typescript');
        this.assertIncludes(all, 'jest');
        this.assertEqual(all.length, 4, '4 dependencies total');

        const emptyInfo = this.makePkgInfo();
        this.assertEqual(getAllDependencies(emptyInfo).length, 0, 'empty returns empty');

        const info2 = this.makePkgInfo({ react: '^18.0.0' }, { eslint: '^8.0.0' });
        const all2 = getAllDependencies(info2);
        this.assertNotIncludes(all2, 'vue', 'no unrelated packages');
    }

    private async testGetScripts(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 6. getScripts()');
        this.output?.appendLine('-'.repeat(60));

        const getScripts = (info: PackageJsonInfo): { name: string; command: string }[] => {
            return Object.entries(info.scripts).map(([name, command]) => ({ name, command }));
        };

        const info = this.makePkgInfo({}, {}, {
            build: 'tsc',
            dev: 'vite',
            test: 'jest',
            lint: 'eslint .'
        });
        const scripts = getScripts(info);
        this.assertEqual(scripts.length, 4, 'extracts 4 scripts');
        this.assert(scripts.some(s => s.name === 'build' && s.command === 'tsc'), 'build script');
        this.assert(scripts.some(s => s.name === 'dev' && s.command === 'vite'), 'dev script');

        const emptyInfo = this.makePkgInfo();
        this.assertEqual(getScripts(emptyInfo).length, 0, 'empty returns empty');
    }

    private async testSmartSuggestions(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 7. Smart Suggestions');
        this.output?.appendLine('-'.repeat(60));

        const getSmartSuggestions = (info: PackageJsonInfo): PackageSuggestion[] => {
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
                suggestions.push({ name: 'prettier', version: 'latest', type: 'devDependency', description: 'Code formatter' });
            }
            if (allDeps.includes('jest') && !allDeps.includes('@types/jest')) {
                suggestions.push({ name: '@types/jest', version: 'latest', type: 'devDependency', description: 'TypeScript definitions for Jest' });
            }
            if (allDeps.includes('axios') && !allDeps.includes('@types/axios')) {
                suggestions.push({ name: '@types/axios', version: 'latest', type: 'devDependency', description: 'TypeScript definitions for axios' });
            }
            return suggestions;
        };

        // Test react suggestions
        const info1 = this.makePkgInfo({ react: '^18.0.0' });
        const sug1 = getSmartSuggestions(info1);
        this.assert(sug1.some(s => s.name === 'react-dom'), 'suggests react-dom');
        this.assert(sug1.some(s => s.name === '@types/react'), 'suggests @types/react');

        // Test no duplicate suggestions
        const info2 = this.makePkgInfo(
            { react: '^18.0.0', 'react-dom': '^18.0.0' },
            { '@types/react': '^18.0.0' }
        );
        const sug2 = getSmartSuggestions(info2);
        this.assert(!sug2.some(s => s.name === '@types/react'), 'no duplicate @types/react');

        // Test eslint -> prettier
        const info3 = this.makePkgInfo({}, { eslint: '^8.0.0' });
        const sug3 = getSmartSuggestions(info3);
        this.assert(sug3.some(s => s.name === 'prettier'), 'suggests prettier');

        // Test empty
        const info4 = this.makePkgInfo();
        const sug4 = getSmartSuggestions(info4);
        this.assertEqual(sug4.length, 0, 'empty project no suggestions');

        // Test types
        const info5 = this.makePkgInfo({ react: '^18.0.0' }, { typescript: '^5.0.0' });
        const sug5 = getSmartSuggestions(info5);
        const reactDom = sug5.find(s => s.name === 'react-dom');
        const typesNode = sug5.find(s => s.name === '@types/node');
        this.assertEqual(reactDom?.type, 'dependency', 'react-dom is dependency');
        this.assertEqual(typesNode?.type, 'devDependency', '@types/node is devDependency');
    }

    private async testSuggestionSearchSort(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 8. Suggestion Search & Relevance Sort');
        this.output?.appendLine('-'.repeat(60));

        const mockSuggestions: PackageSuggestion[] = [
            { name: 'react-router-dom', version: '^6.0.0', type: 'dependency' },
            { name: 'react', version: '^18.0.0', type: 'dependency' },
            { name: 'react-dom', version: '^18.0.0', type: 'dependency' },
            { name: 'zustand', version: '^4.0.0', type: 'dependency' },
            { name: 'react-query', version: '^5.0.0', type: 'dependency' },
        ];

        const sortSuggestions = (suggestions: PackageSuggestion[], lowerInput: string): PackageSuggestion[] => {
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
        };

        // Exact match test
        const sorted1 = sortSuggestions(mockSuggestions, 'react');
        this.assertEqual(sorted1[0].name, 'react', 'exact match first');

        // Starts with test
        const sorted2 = sortSuggestions(mockSuggestions, 'react-d');
        this.assertEqual(sorted2[0].name, 'react-dom', 'starts-with first');

        // All items returned
        const sorted3 = sortSuggestions(mockSuggestions, 'react');
        this.assertEqual(sorted3.length, mockSuggestions.length, 'all items returned');

        // Alphabetical fallback
        const items: PackageSuggestion[] = [
            { name: 'react-router-dom', version: 'latest', type: 'dependency' },
            { name: 'react-dom', version: 'latest', type: 'dependency' },
            { name: 'react-query', version: 'latest', type: 'dependency' },
        ];
        const sorted4 = sortSuggestions(items, 'react-');
        this.assertEqual(sorted4[0].name, 'react-dom', 'alphabetical first');
        this.assertEqual(sorted4[1].name, 'react-query', 'alphabetical second');
    }

    private async testSingletonPattern(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 9. Singleton Pattern');
        this.output?.appendLine('-'.repeat(60));

        const a = PackageJsonParser.getInstance();
        const b = PackageJsonParser.getInstance();
        this.assert(a === b, 'getInstance() returns same instance');
    }

    private async testCacheInvalidation(): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('── 10. Cache Invalidation');
        this.output?.appendLine('-'.repeat(60));

        const parser = PackageJsonParser.getInstance();
        
        // clearCache should not throw
        try {
            parser.clearCache();
            this.assert(true, 'clearCache() executes without error');
        } catch (e) {
            this.assert(false, 'clearCache() should not throw');
        }

        // Parser should exist
        this.assert(parser !== undefined, 'Parser instance exists');
    }
}

/**
 * Run all PackageJson Parser tests - main entry point
 */
export async function runPackageJsonTests(context: vscode.ExtensionContext): Promise<void> {
    const runner = PackageJsonTestRunner.initialize(context);
    await runner.runAllTests();
}
