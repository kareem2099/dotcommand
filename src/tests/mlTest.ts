/**
 * MLSuggestions Test Runner
 * 
 * Comprehensive test suite for MLSuggestions with visual output and detailed reporting.
 * Mirrors the structure of analyticsTest.ts for consistency.
 */

import * as vscode from 'vscode';
import { MLSuggestions, MLSuggestionItem, MLScoringConfig } from '../utils/mlSuggestions';
import { AnalyticsService } from '../services/analyticsService';

export class MLTestRunner {
    private static instance: MLTestRunner;
    private context: vscode.ExtensionContext;
    private passed = 0;
    private failed = 0;
    private results: string[] = [];
    private output?: vscode.OutputChannel;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(context?: vscode.ExtensionContext): MLTestRunner {
        if (!MLTestRunner.instance) {
            if (!context) {
                throw new Error('MLTestRunner requires context on first initialization');
            }
            MLTestRunner.instance = new MLTestRunner(context);
        }
        return MLTestRunner.instance;
    }

    public static initialize(context: vscode.ExtensionContext): MLTestRunner {
        MLTestRunner.instance = new MLTestRunner(context);
        return MLTestRunner.instance;
    }

    /**
     * Run all ML tests with visual output
     */
    public async runAllTests(): Promise<void> {
        try {
            // Setup output channel
            this.output = vscode.window.createOutputChannel('ML Tests');
            this.output.clear();
            this.output.show();

            this.output.appendLine('='.repeat(60));
            this.output.appendLine('🤖 ML SUGGESTIONS TEST SUITE');
            this.output.appendLine('='.repeat(60));
            this.output.appendLine('');

            console.log('=== Starting MLSuggestions Tests ===\n');
            this.passed = 0;
            this.failed = 0;
            this.results = [];

            // Initialize dependencies
            AnalyticsService.initialize(this.context);
            const ml = MLSuggestions.initialize(this.context);

            // Run test suites
            await this.safeRunTest('Initialization',        () => this.testInitialization(ml));
            await this.safeRunTest('Configuration',         () => this.testConfiguration(ml));
            await this.safeRunTest('Score Calculation',     () => this.testScoreCalculation(ml));
            await this.safeRunTest('Context Scoring',       () => this.testContextScoring(ml));
            await this.safeRunTest('Batch Scoring',         () => this.testBatchScoring(ml));
            await this.safeRunTest('Top Suggestions',       () => this.testTopSuggestions(ml));
            await this.safeRunTest('Insights',              () => this.testInsights(ml));
            await this.safeRunTest('Learning Interactions', () => this.testLearning(ml));
            await this.safeRunTest('Config Validation',     () => this.testConfigValidation(ml));
            await this.safeRunTest('Performance Benchmark', () => this.testPerformanceBenchmark(ml));

            // ── Summary ──────────────────────────────────────────────
            this.output.appendLine('');
            this.output.appendLine('='.repeat(60));
            this.output.appendLine('📊 TEST RESULTS');
            this.output.appendLine('='.repeat(60));
            this.output.appendLine(`✅ Passed: ${this.passed}/${this.passed + this.failed}`);
            this.output.appendLine(`❌ Failed: ${this.failed}/${this.passed + this.failed}`);
            this.output.appendLine(
                `📈 Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`
            );
            this.output.appendLine('');

            console.log('\n=== Test Results ===');
            console.log(`Passed: ${this.passed}`);
            console.log(`Failed: ${this.failed}`);
            console.log(`Total:  ${this.passed + this.failed}`);

            if (this.failed > 0) {
                this.output.appendLine('❌ FAILED TESTS:');
                this.output.appendLine('-'.repeat(60));
                this.results
                    .filter(r => r.startsWith('❌'))
                    .forEach(r => this.output?.appendLine(r));
            } else {
                this.output.appendLine('🎉 ALL TESTS PASSED!');
            }

            // Notification
            if (this.failed === 0) {
                vscode.window.showInformationMessage(
                    `✅ All ML Tests Passed (${this.passed}/${this.passed + this.failed})!`,
                    'View Details'
                ).then(sel => { if (sel === 'View Details') this.output?.show(); });
            } else {
                vscode.window.showWarningMessage(
                    `⚠️ ${this.failed} ML Test(s) Failed`,
                    'View Details'
                ).then(sel => { if (sel === 'View Details') this.output?.show(); });
            }

        } catch (error) {
            this.output?.appendLine('');
            this.output?.appendLine('💥 CRITICAL ERROR:');
            this.output?.appendLine(String(error));
            vscode.window.showErrorMessage('ML test suite crashed: ' + error);
        }
    }

    // ─────────────────────── helpers ────────────────────────────────

    private async safeRunTest(name: string, testFn: () => Promise<void>): Promise<void> {
        try {
            await testFn();
        } catch (error) {
            this.failed++;
            const msg = `❌ ${name} - Test crashed: ${error}`;
            this.results.push(msg);
            this.output?.appendLine(msg);
            if (error instanceof Error && error.stack) {
                this.output?.appendLine(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
            }
            console.error(msg);
        }
    }

    private assert(condition: boolean, testName: string, extra?: string): void {
        if (condition) {
            this.passed++;
            const msg = `✅ ${testName}`;
            this.results.push(msg);
            console.log(msg);
            this.output?.appendLine(msg);
        } else {
            this.failed++;
            const msg = `❌ ${testName}${extra ? ` (${extra})` : ''}`;
            this.results.push(msg);
            console.log(msg);
            this.output?.appendLine(msg);
        }
    }

    // ─────────────────────── test suites ────────────────────────────

    /**
     * 1. Initialization Tests
     */
    private async testInitialization(_ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('🤖 Initialization Tests');
        this.output?.appendLine('-'.repeat(60));

        // getInstance should return the same instance
        const instance1 = MLSuggestions.getInstance();
        const instance2 = MLSuggestions.getInstance();
        this.assert(instance1 === instance2, 'getInstance returns singleton');

        // Re-initialize creates a fresh instance
        const fresh = MLSuggestions.initialize(this.context);
        this.assert(fresh !== undefined, 'initialize returns an instance');
        this.assert(fresh instanceof MLSuggestions, 'initialize returns MLSuggestions');
    }

    /**
     * 2. Configuration Tests
     */
    private async testConfiguration(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('⚙️  Configuration Tests');
        this.output?.appendLine('-'.repeat(60));

        // Default config values
        ml.resetConfig();
        const cfg = ml.getConfig();
        this.output?.appendLine(`   ℹ️ frequencyWeight : ${cfg.frequencyWeight}`);
        this.output?.appendLine(`   ℹ️ recencyWeight   : ${cfg.recencyWeight}`);
        this.output?.appendLine(`   ℹ️ categoryWeight  : ${cfg.categoryWeight}`);
        this.output?.appendLine(`   ℹ️ contextWeight   : ${cfg.contextWeight}`);
        this.output?.appendLine(`   ℹ️ analyticsWeight : ${cfg.analyticsWeight}`);

        this.assert(cfg.frequencyWeight === 0.3,  'Default frequencyWeight is 0.3');
        this.assert(cfg.recencyWeight   === 0.3,  'Default recencyWeight is 0.3');
        this.assert(cfg.categoryWeight  === 0.2,  'Default categoryWeight is 0.2');
        this.assert(cfg.contextWeight   === 0.1,  'Default contextWeight is 0.1');
        this.assert(cfg.analyticsWeight === 0.1,  'Default analyticsWeight is 0.1');

        const weightSum = cfg.frequencyWeight + cfg.recencyWeight +
                          cfg.categoryWeight  + cfg.contextWeight + cfg.analyticsWeight;
        this.output?.appendLine(`   ℹ️ Sum of weights   : ${weightSum.toFixed(2)}`);
        this.assert(Math.abs(weightSum - 1.0) < 0.001, 'Default weights sum to 1.0');

        // updateConfig partial update
        ml.updateConfig({ frequencyWeight: 0.5 });
        const updated = ml.getConfig();
        this.assert(updated.frequencyWeight === 0.5,  'updateConfig updates frequencyWeight');
        this.assert(updated.recencyWeight   === 0.3,  'updateConfig preserves other weights');

        // resetConfig restores defaults
        ml.resetConfig();
        const reset = ml.getConfig();
        this.assert(reset.frequencyWeight === 0.3,  'resetConfig restores frequencyWeight');

        // exportConfig / importConfig round-trip
        ml.updateConfig({ contextWeight: 0.25 });
        const exported = ml.exportConfig();
        const parsed   = JSON.parse(exported) as MLScoringConfig;
        this.assert(parsed.contextWeight === 0.25, 'exportConfig contains updated value');

        ml.resetConfig();
        const imported = ml.importConfig(exported);
        this.assert(imported === true, 'importConfig returns true on valid JSON');
        this.assert(ml.getConfig().contextWeight === 0.25, 'importConfig restores values');

        const badImport = ml.importConfig('{ invalid json >>>');
        this.assert(badImport === false, 'importConfig returns false on invalid JSON');

        // Restore defaults for remaining tests
        ml.resetConfig();
    }

    /**
     * 3. Score Calculation Tests
     */
    private async testScoreCalculation(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('🎯 Score Calculation Tests');
        this.output?.appendLine('-'.repeat(60));

        const item = { id: 'cmd-git-status', name: 'Git Status', command: 'git status', category: 'git' };
        const result: MLSuggestionItem = await ml.calculateScore(item);

        this.output?.appendLine(`   ℹ️ id       : ${result.id}`);
        this.output?.appendLine(`   ℹ️ score    : ${result.score}`);
        this.output?.appendLine(`   ℹ️ frequency: ${result.factors.frequency}`);
        this.output?.appendLine(`   ℹ️ recency  : ${result.factors.recency}`);
        this.output?.appendLine(`   ℹ️ category : ${result.factors.category}`);
        this.output?.appendLine(`   ℹ️ context  : ${result.factors.context}`);
        this.output?.appendLine(`   ℹ️ analytics: ${result.factors.analytics}`);

        // Identity checks
        this.assert(result.id      === item.id,      'calculateScore preserves id');
        this.assert(result.name    === item.name,     'calculateScore preserves name');
        this.assert(result.command === item.command,  'calculateScore preserves command');
        this.assert(result.category === item.category,'calculateScore preserves category');

        // Score range 0–1
        this.assert(result.score >= 0 && result.score <= 1, 'Score is in range [0, 1]');

        // All 5 factor fields present
        this.assert(result.factors.frequency  !== undefined, 'factors.frequency present');
        this.assert(result.factors.recency    !== undefined, 'factors.recency present');
        this.assert(result.factors.category   !== undefined, 'factors.category present');
        this.assert(result.factors.context    !== undefined, 'factors.context present');
        this.assert(result.factors.analytics  !== undefined, 'factors.analytics present');

        // Each factor is in range [0, 1]
        this.assert(result.factors.frequency  >= 0 && result.factors.frequency  <= 1, 'frequency factor in [0,1]');
        this.assert(result.factors.recency    >= 0 && result.factors.recency    <= 1, 'recency factor in [0,1]');
        this.assert(result.factors.category   >= 0 && result.factors.category   <= 1, 'category factor in [0,1]');
        this.assert(result.factors.context    >= 0 && result.factors.context    <= 1, 'context factor in [0,1]');
        this.assert(result.factors.analytics  >= 0 && result.factors.analytics  <= 1, 'analytics factor in [0,1]');

        // Score is rounded to 2 decimal places
        const rounded = Math.round(result.score * 100) / 100;
        this.assert(result.score === rounded, 'Score rounded to 2 decimal places');
    }

    /**
     * 4. Context Scoring Tests
     */
    private async testContextScoring(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('🔍 Context Scoring Tests');
        this.output?.appendLine('-'.repeat(60));

        const gitItem = { id: 'git-commit', name: 'Git Commit', command: 'git commit', category: 'git' };

        // Exact category match context → higher category factor
        const withExactCtx = await ml.calculateScore(gitItem, { currentCategory: 'git' });
        const withNoCtx    = await ml.calculateScore(gitItem);
        this.output?.appendLine(`   ℹ️ category factor (exact match): ${withExactCtx.factors.category}`);
        this.output?.appendLine(`   ℹ️ category factor (no context) : ${withNoCtx.factors.category}`);
        this.assert(
            withExactCtx.factors.category >= withNoCtx.factors.category,
            'Exact category match gives higher category factor'
        );

        // Partial category match
        const partialCtx = await ml.calculateScore(gitItem, { currentCategory: 'git-hooks' });
        this.output?.appendLine(`   ℹ️ category factor (partial)     : ${partialCtx.factors.category}`);
        this.assert(partialCtx.factors.category > 0.1, 'Partial category match gives non-minimal score');

        // Recent commands boost context factor
        const withRecent    = await ml.calculateScore(gitItem, { recentCommands: ['git commit', 'git push'] });
        const withoutRecent = await ml.calculateScore(gitItem);
        this.output?.appendLine(`   ℹ️ context factor (in recent)    : ${withRecent.factors.context}`);
        this.output?.appendLine(`   ℹ️ context factor (not in recent): ${withoutRecent.factors.context}`);
        this.assert(
            withRecent.factors.context >= withoutRecent.factors.context,
            'Recent command match boosts context factor'
        );

        // Prefix-only match
        const prefixCtx = await ml.calculateScore(gitItem, { recentCommands: ['git push', 'git fetch'] });
        this.output?.appendLine(`   ℹ️ context factor (prefix match) : ${prefixCtx.factors.context}`);
        this.assert(prefixCtx.factors.context >= 0.5, 'Command prefix match gives at least 0.5 context factor');

        // Unrelated context
        const unrelated = await ml.calculateScore(gitItem, { currentCategory: 'docker', recentCommands: ['npm install'] });
        this.output?.appendLine(`   ℹ️ category factor (unrelated)   : ${unrelated.factors.category}`);
        this.assert(unrelated.factors.category <= 0.5, 'Unrelated category gives low category factor');
    }

    /**
     * 5. Batch Scoring Tests
     */
    private async testBatchScoring(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📦 Batch Scoring Tests');
        this.output?.appendLine('-'.repeat(60));

        const items = [
            { id: 'a', name: 'Alpha',   command: 'alpha',   category: 'misc' },
            { id: 'b', name: 'Beta',    command: 'beta',    category: 'misc' },
            { id: 'c', name: 'Charlie', command: 'charlie', category: 'misc' },
            { id: 'd', name: 'Delta',   command: 'delta',   category: 'misc' },
            { id: 'e', name: 'Echo',    command: 'echo',    category: 'misc' },
        ];

        const sorted = await ml.scoreAndSort(items);

        this.output?.appendLine(`   ℹ️ Items returned: ${sorted.length}`);
        sorted.forEach(i => this.output?.appendLine(`   ℹ️   ${i.name}: ${i.score}`));

        this.assert(sorted.length === items.length, 'scoreAndSort returns same count as input');

        // Verify descending order
        let descending = true;
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].score < sorted[i + 1].score) {
                descending = false;
                break;
            }
        }
        this.assert(descending, 'scoreAndSort returns items in descending score order');

        // Empty input
        const emptyResult = await ml.scoreAndSort([]);
        this.assert(emptyResult.length === 0, 'scoreAndSort handles empty array');

        // Single item
        const single = await ml.scoreAndSort([items[0]]);
        this.assert(single.length === 1, 'scoreAndSort handles single item');
    }

    /**
     * 6. Top Suggestions Tests
     */
    private async testTopSuggestions(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('🏆 Top Suggestions Tests');
        this.output?.appendLine('-'.repeat(60));

        const items = Array.from({ length: 10 }, (_, i) => ({
            id:       `cmd-${i}`,
            name:     `Command ${i}`,
            command:  `command-${i}`,
            category: 'test'
        }));

        // Default top 5
        const top5 = await ml.getTopSuggestions(items);
        this.output?.appendLine(`   ℹ️ Default top N: ${top5.length}`);
        this.assert(top5.length === 5, 'getTopSuggestions returns 5 by default');

        // Custom top 3
        const top3 = await ml.getTopSuggestions(items, 3);
        this.output?.appendLine(`   ℹ️ Custom top 3: ${top3.length}`);
        this.assert(top3.length === 3, 'getTopSuggestions returns N=3');

        // Top N > available items
        const top20 = await ml.getTopSuggestions(items, 20);
        this.output?.appendLine(`   ℹ️ Top 20 from 10 items: ${top20.length}`);
        this.assert(top20.length === items.length, 'getTopSuggestions capped at available items');

        // Results are still sorted
        let sorted = true;
        for (let i = 0; i < top5.length - 1; i++) {
            if (top5[i].score < top5[i + 1].score) { sorted = false; break; }
        }
        this.assert(sorted, 'getTopSuggestions results are sorted by score');
    }

    /**
     * 7. Insights Tests
     */
    private async testInsights(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('💡 Insights Tests');
        this.output?.appendLine('-'.repeat(60));

        const insights = await ml.getInsights('git status');

        this.output?.appendLine(`   ℹ️ score          : ${insights.score}`);
        this.output?.appendLine(`   ℹ️ factors        : ${insights.factors.join(', ')}`);
        this.output?.appendLine(`   ℹ️ recommendation : ${insights.recommendation}`);

        // Structure checks
        this.assert(typeof insights.score          === 'number',  'getInsights returns numeric score');
        this.assert(Array.isArray(insights.factors),              'getInsights returns factors array');
        this.assert(typeof insights.recommendation === 'string',  'getInsights returns recommendation string');
        this.assert(insights.factors.length >= 1,                 'getInsights returns at least one factor');
        this.assert(insights.score >= 0,                          'Insights score is non-negative');
        this.assert(insights.recommendation.length > 0,           'Insights recommendation is non-empty');

        // Score range (combined frequency + recency, scaled 0–100)
        this.assert(insights.score <= 100, 'Insights score is at most 100');
    }

    /**
     * 8. Learning Interaction Tests
     */
    private async testLearning(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📚 Learning Interaction Tests');
        this.output?.appendLine('-'.repeat(60));

        // Ensure analytics is initialized
        AnalyticsService.initialize(this.context);
        const analytics = AnalyticsService.getInstance();
        analytics.clearAllData();

        // recordPositive should call analytics.trackSuggestionAccepted
        await ml.recordPositive('learn-cmd-1');
        const statsAfterPositive = analytics.getSuggestionStats();
        const positiveEntry = statsAfterPositive.find(s => s.suggestionId === 'learn-cmd-1');
        this.output?.appendLine(`   ℹ️ accepted after recordPositive: ${positiveEntry?.accepted ?? 0}`);
        this.assert(
            (positiveEntry?.accepted ?? 0) >= 1,
            'recordPositive increments accepted count in analytics'
        );

        // recordNegative should call analytics.trackSuggestionDismissed
        await ml.recordNegative('learn-cmd-2');
        const statsAfterNegative = analytics.getSuggestionStats();
        const negativeEntry = statsAfterNegative.find(s => s.suggestionId === 'learn-cmd-2');
        this.output?.appendLine(`   ℹ️ dismissed after recordNegative: ${negativeEntry?.dismissed ?? 0}`);
        this.assert(
            (negativeEntry?.dismissed ?? 0) >= 1,
            'recordNegative increments dismissed count in analytics'
        );

        // Multiple positive interactions accumulate
        await ml.recordPositive('learn-cmd-3');
        await ml.recordPositive('learn-cmd-3');
        const multiStats = analytics.getSuggestionStats();
        const multiEntry = multiStats.find(s => s.suggestionId === 'learn-cmd-3');
        this.output?.appendLine(`   ℹ️ accepted after 2x recordPositive: ${multiEntry?.accepted ?? 0}`);
        this.assert(
            (multiEntry?.accepted ?? 0) === 2,
            'Multiple recordPositive calls accumulate correctly'
        );
    }

    /**
     * 9. Config Weight Validation Tests
     */
    private async testConfigValidation(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('🔧 Config Weight Validation Tests');
        this.output?.appendLine('-'.repeat(60));

        const item = { id: 'validate-cmd', name: 'Validate', command: 'validate', category: 'test' };

        // Default weights
        ml.resetConfig();
        const defaultResult = await ml.calculateScore(item);
        this.output?.appendLine(`   ℹ️ Score with default weights: ${defaultResult.score}`);

        // Mutate contextWeight to 0 — context factor should not move the score
        ml.updateConfig({ contextWeight: 0, frequencyWeight: 0.4, recencyWeight: 0.4, categoryWeight: 0.2, analyticsWeight: 0 });
        const noCtxResult = await ml.calculateScore(item, { recentCommands: [item.command] });
        this.output?.appendLine(`   ℹ️ Score with contextWeight=0: ${noCtxResult.score}`);

        // Score is purely weighted sum; changing weights must keep score in [0, 1]
        this.assert(noCtxResult.score >= 0 && noCtxResult.score <= 1, 'Score stays in [0,1] with custom weights');

        // Extreme: all weight on context, command in recent list → context factor = 1.0
        ml.updateConfig({ frequencyWeight: 0, recencyWeight: 0, categoryWeight: 0, contextWeight: 1.0, analyticsWeight: 0 });
        const fullCtxResult = await ml.calculateScore(item, { recentCommands: [item.command] });
        this.output?.appendLine(`   ℹ️ Score with contextWeight=1.0 + match: ${fullCtxResult.score}`);
        this.assert(fullCtxResult.score === 1.0, 'Score = 1.0 when contextWeight=1.0 and command matches recent');

        // Restore defaults
        ml.resetConfig();
        const restored = ml.getConfig();
        this.assert(restored.contextWeight === 0.1, 'Weights restored to defaults after test');
    }

    /**
     * 10. Performance Benchmark
     */
    private async testPerformanceBenchmark(ml: MLSuggestions): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('⚡ Performance Benchmark');
        this.output?.appendLine('-'.repeat(60));

        const itemCount = 100;
        const items = Array.from({ length: itemCount }, (_, i) => ({
            id:       `bench-${i}`,
            name:     `Bench Command ${i}`,
            command:  `bench-command-${i}`,
            category: i % 2 === 0 ? 'git' : 'npm'
        }));

        const start = Date.now();
        const results = await ml.scoreAndSort(items, { currentCategory: 'git', recentCommands: ['bench-command-0'] });
        const duration = Date.now() - start;
        const avgTime = duration / itemCount;

        this.output?.appendLine(`   ℹ️ Scored ${itemCount} items in ${duration}ms`);
        this.output?.appendLine(`   ℹ️ Average per item: ${avgTime.toFixed(2)}ms`);
        this.output?.appendLine(`   ℹ️ Top scorer: "${results[0]?.name}" (${results[0]?.score})`);

        this.assert(results.length === itemCount, `Benchmark returned all ${itemCount} results`);
        this.assert(duration < 2000,               `Scored ${itemCount} items in under 2 000ms (actual: ${duration}ms)`);
    }
}

// ─────────────────────── entry points ───────────────────────────────

/**
 * Run all ML tests — main entry point called from extension.ts
 */
export async function runMLTests(context: vscode.ExtensionContext): Promise<void> {
    const runner = MLTestRunner.initialize(context);
    await runner.runAllTests();
}

/**
 * Quick sanity check — verifies the ML service initialises without error
 */
export function quickMLTest(context: vscode.ExtensionContext): void {
    MLSuggestions.initialize(context);
    const ml = MLSuggestions.getInstance();
    const cfg = ml.getConfig();
    console.log('Quick ML test — frequencyWeight:', cfg.frequencyWeight);
    console.log('Quick ML test — sum of weights :',
        cfg.frequencyWeight + cfg.recencyWeight +
        cfg.categoryWeight  + cfg.contextWeight + cfg.analyticsWeight
    );
}
