/**
 * AnalyticsService Test Runner - Enhanced Version
 * 
 * Comprehensive test suite with visual output and detailed reporting
 */

import * as vscode from 'vscode';
import { AnalyticsService } from '../services/analyticsService';

export class AnalyticsTestRunner {
    private static instance: AnalyticsTestRunner;
    private context: vscode.ExtensionContext;
    private passed = 0;
    private failed = 0;
    private results: string[] = [];
    private output?: vscode.OutputChannel;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(context?: vscode.ExtensionContext): AnalyticsTestRunner {
        if (!AnalyticsTestRunner.instance) {
            if (!context) {
                throw new Error('AnalyticsTestRunner requires context on first initialization');
            }
            AnalyticsTestRunner.instance = new AnalyticsTestRunner(context);
        }
        return AnalyticsTestRunner.instance;
    }

    public static initialize(context: vscode.ExtensionContext): AnalyticsTestRunner {
        AnalyticsTestRunner.instance = new AnalyticsTestRunner(context);
        return AnalyticsTestRunner.instance;
    }

    /**
     * Run all tests with visual output
     */
    public async runAllTests(): Promise<void> {
        try {
            // Setup output channel
            this.output = vscode.window.createOutputChannel('Analytics Tests');
            this.output.clear();
            this.output.show();

            this.output.appendLine('='.repeat(60));
            this.output.appendLine('🧪 ANALYTICS SERVICE TEST SUITE');
            this.output.appendLine('='.repeat(60));
            this.output.appendLine('');

            console.log('=== Starting AnalyticsService Tests ===\n');
            this.passed = 0;
            this.failed = 0;
            this.results = [];

            // Initialize service
            AnalyticsService.initialize(this.context);
            const service = AnalyticsService.getInstance();

            // Run test suites with error handling
            await this.safeRunTest('Session Tracking', () => this.testSessionTracking(service));
            await this.safeRunTest('Suggestion Analytics', () => this.testSuggestionAnalytics(service));
            await this.safeRunTest('Command Success Rate', () => this.testCommandSuccessRate(service));
            await this.safeRunTest('Context Accuracy', () => this.testContextAccuracy(service));
            await this.safeRunTest('Performance Metrics', () => this.testPerformanceMetrics(service));
            await this.safeRunTest('Category Preferences', () => this.testCategoryPreferences(service));
            await this.safeRunTest('Analytics Summary', () => this.testAnalyticsSummary(service));
            await this.safeRunTest('Data Export', () => this.testDataExport(service));
            await this.safeRunTest('Performance Benchmark', () => this.testPerformanceBenchmark(service));

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
                    `✅ All Analytics Tests Passed (${this.passed}/${this.passed + this.failed})!`,
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

    private async safeRunTest(name: string, testFn: () => Promise<void>): Promise<void> {
        try {
            await testFn();
        } catch (error) {
            this.failed++;
            const msg = `❌ ${name} - Test crashed: ${error}`;
            this.results.push(msg);
            this.output?.appendLine(msg);
            if (error instanceof Error && error.stack) {
                this.output?.appendLine(`   Stack: ${error.stack.split('\n')[1].trim()}`);
            }
            console.error(msg);
        }
    }

    private assert(condition: boolean, testName: string): void {
        if (condition) {
            this.passed++;
            const msg = `✅ ${testName}`;
            this.results.push(msg);
            console.log(msg);
            this.output?.appendLine(msg);
        } else {
            this.failed++;
            const msg = `❌ ${testName}`;
            this.results.push(msg);
            console.log(msg);
            this.output?.appendLine(msg);
        }
    }

    // ==================== TEST SUITES ====================

    private async testSessionTracking(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📊 Session Tracking Tests');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Session Tracking Tests ---');

        const sessionInfo = service.getSessionInfo();
        
        this.output?.appendLine(`   ℹ️ Session ID: ${sessionInfo.sessionId}`);
        this.output?.appendLine(`   ℹ️ Duration: ${Math.round(sessionInfo.duration / 1000)}s`);
        
        this.assert(sessionInfo.sessionId.startsWith('session_'), 'Session ID starts with session_');
        this.assert(sessionInfo.duration >= 0, 'Session duration is non-negative');

        service.trackSessionEvent('test_event', { test: true });
        this.assert(true, 'Track session event without error');
    }

    private async testSuggestionAnalytics(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📊 Suggestion Analytics Tests');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Suggestion Analytics Tests ---');

        service.clearAllData();

        // Test full lifecycle
        service.trackSuggestionShown('suggestion-1');
        let stats = service.getSuggestionStats();
        let suggestion = stats.find(s => s.suggestionId === 'suggestion-1');
        this.output?.appendLine(`   ℹ️ After shown - Count: ${suggestion?.shown || 0}`);
        this.assert(suggestion?.shown === 1, 'Track suggestion shown');

        service.trackSuggestionClicked('suggestion-1');
        stats = service.getSuggestionStats();
        suggestion = stats.find(s => s.suggestionId === 'suggestion-1');
        this.output?.appendLine(`   ℹ️ After clicked - Count: ${suggestion?.clicked || 0}`);
        this.assert(suggestion?.clicked === 1, 'Track suggestion clicked');

        service.trackSuggestionAccepted('suggestion-1');
        stats = service.getSuggestionStats();
        suggestion = stats.find(s => s.suggestionId === 'suggestion-1');
        this.output?.appendLine(`   ℹ️ After accepted - Count: ${suggestion?.accepted || 0}`);
        this.assert(suggestion?.accepted === 1, 'Track suggestion accepted');

        service.trackSuggestionDismissed('suggestion-1');
        stats = service.getSuggestionStats();
        suggestion = stats.find(s => s.suggestionId === 'suggestion-1');
        this.output?.appendLine(`   ℹ️ After dismissed - Count: ${suggestion?.dismissed || 0}`);
        this.assert(suggestion?.dismissed === 1, 'Track suggestion dismissed');

        // Test acceptance rate
        service.clearAllData();
        service.trackSuggestionShown('test-suggestion');
        service.trackSuggestionShown('test-suggestion');
        service.trackSuggestionAccepted('test-suggestion');
        const summary = service.getAnalyticsSummary(30);
        this.output?.appendLine(`   ℹ️ Acceptance rate: ${summary.acceptanceRate.toFixed(2)}%`);
        this.assert(summary.acceptanceRate === 50, 'Acceptance rate calculated correctly (50%)');
    }

    private async testCommandSuccessRate(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📊 Command Success Rate Tests');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Command Success Rate Tests ---');

        service.clearAllData();

        service.trackCommandResult({
            commandId: 'test-command',
            success: true,
            executionTime: 100,
            timestamp: Date.now()
        });
        let successRate = service.getCommandSuccessRate();
        this.output?.appendLine(`   ℹ️ Success rate (1 success): ${successRate.toFixed(2)}%`);
        this.assert(successRate === 100, 'Success rate 100% for successful commands');

        service.trackCommandResult({
            commandId: 'test-command-fail',
            success: false,
            errorType: 'timeout',
            executionTime: 5000,
            timestamp: Date.now()
        });
        successRate = service.getCommandSuccessRate();
        this.output?.appendLine(`   ℹ️ Success rate (1 success, 1 fail): ${successRate.toFixed(2)}%`);
        this.assert(successRate === 50, 'Success rate 50% for mixed results');
    }

    private async testContextAccuracy(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📊 Context Accuracy Tests');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Context Accuracy Tests ---');

        service.clearAllData();

        service.trackContextAccuracy('react', true);
        let accuracyRate = service.getContextAccuracyRate();
        this.output?.appendLine(`   ℹ️ Accuracy (1 correct): ${accuracyRate.toFixed(2)}%`);
        this.assert(accuracyRate === 100, '100% accuracy for correct detection');

        service.clearAllData();
        service.trackContextAccuracy('react', false);
        accuracyRate = service.getContextAccuracyRate();
        this.output?.appendLine(`   ℹ️ Accuracy (1 incorrect): ${accuracyRate.toFixed(2)}%`);
        this.assert(accuracyRate === 0, '0% accuracy for incorrect detection');

        service.clearAllData();
        service.trackContextAccuracy('react', false, 'vue');
        const accuracies = service.getContextAccuracies();
        this.output?.appendLine(`   ℹ️ User correction: ${accuracies[accuracies.length - 1].userCorrection}`);
        this.assert(
            accuracies[accuracies.length - 1].userCorrection === 'vue',
            'User correction tracked correctly'
        );
    }

    private async testPerformanceMetrics(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📊 Performance Metrics Tests');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Performance Metrics Tests ---');

        // Test timer accuracy
        service.startTimer('test-operation');
        await new Promise(resolve => setTimeout(resolve, 100));
        const duration = service.endTimer('test-operation', true);
        
        this.output?.appendLine(`   ℹ️ Measured duration: ${duration}ms (expected: ~100ms)`);
        const isAccurate = duration !== null && duration >= 90 && duration <= 120;
        this.assert(isAccurate, 'Timer accuracy within margin');
        this.assert(duration !== null, 'Timer returns non-null');

        // Test unknown timer
        const unknownDuration = service.endTimer('unknown-timer');
        this.assert(unknownDuration === null, 'Unknown timer returns null');

        // Test direct metric tracking
        service.trackPerformanceMetric({
            operation: 'direct-test',
            startTime: Date.now() - 100,
            endTime: Date.now(),
            duration: 100,
            success: true
        });
        const avgTime = service.getAverageResponseTime('direct-test');
        this.output?.appendLine(`   ℹ️ Average response time: ${avgTime.toFixed(2)}ms`);
        this.assert(avgTime === 100, 'Average response time calculated correctly');
    }

    private async testCategoryPreferences(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📊 Category Preferences Tests');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Category Preferences Tests ---');

        service.clearAllData();

        service.trackCommandExecuted('git commit', 'git');
        service.trackCommandExecuted('git push', 'git');
        
        const preferences = service.getCategoryPreferences();
        const gitPref = preferences.find(p => p.category === 'git');
        
        this.output?.appendLine(`   ℹ️ Git category usage: ${gitPref?.usageCount || 0}`);
        this.output?.appendLine(`   ℹ️ Git preference score: ${gitPref?.preferenceScore.toFixed(2) || 0}`);
        
        this.assert(gitPref?.usageCount === 2, 'Category usage count tracked');

        const score = service.getCategoryPreferenceScore('git');
        this.assert(score > 0, 'Preference score calculated');
    }

    private async testAnalyticsSummary(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📊 Analytics Summary Tests');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Analytics Summary Tests ---');

        service.clearAllData();

        service.trackSuggestionShown('sug-1');
        service.trackSuggestionAccepted('sug-1');
        
        const summary = service.getAnalyticsSummary(30);
        
        this.output?.appendLine(`   ℹ️ Suggestions shown: ${summary.totalSuggestionsShown}`);
        this.output?.appendLine(`   ℹ️ Suggestions accepted: ${summary.totalSuggestionsAccepted}`);
        this.output?.appendLine(`   ℹ️ Acceptance rate: ${summary.acceptanceRate.toFixed(2)}%`);
        
        this.assert(summary.totalSuggestionsShown >= 1, 'Summary shows suggestions shown');
        this.assert(summary.totalSuggestionsAccepted >= 1, 'Summary shows suggestions accepted');
        this.assert(summary.period.start < summary.period.end, 'Summary period is valid');
    }

    private async testDataExport(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('📊 Data Export Tests');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Data Export Tests ---');

        service.clearAllData();
        service.trackSuggestionShown('test');

        const exportData = service.exportData();
        const parsed = JSON.parse(exportData);
        
        this.output?.appendLine(`   ℹ️ Export date: ${parsed.exportDate}`);
        this.output?.appendLine(`   ℹ️ Retention days: ${parsed.retentionDays}`);
        
        this.assert(exportData.includes('exportDate'), 'Export contains exportDate');
        this.assert(exportData.includes('summary'), 'Export contains summary');
        this.assert(exportData.includes('suggestionStats'), 'Export contains suggestionStats');

        service.clearAllData();
        const summary = service.getAnalyticsSummary(30);
        this.assert(summary.totalSuggestionsShown === 0, 'All data cleared');
    }

    private async testPerformanceBenchmark(service: AnalyticsService): Promise<void> {
        this.output?.appendLine('');
        this.output?.appendLine('⚡ Performance Benchmark');
        this.output?.appendLine('-'.repeat(60));
        console.log('\n--- Performance Benchmark ---');

        const iterations = 1000;
        const start = Date.now();

        for (let i = 0; i < iterations; i++) {
            service.trackSuggestionShown(`test-${i}`);
        }

        const duration = Date.now() - start;
        const avgTime = duration / iterations;

        this.output?.appendLine(`   ℹ️ Tracked ${iterations} events in ${duration}ms`);
        this.output?.appendLine(`   ℹ️ Average time per event: ${avgTime.toFixed(3)}ms`);

        this.assert(avgTime < 1, `Performance acceptable (${avgTime.toFixed(3)}ms per event)`);
    }
}

/**
 * Run tests - main entry point
 */
export async function runAnalyticsTests(context: vscode.ExtensionContext): Promise<void> {
    const runner = AnalyticsTestRunner.initialize(context);
    await runner.runAllTests();
}

/**
 * Quick test - verify service initializes
 */
export function quickTest(context: vscode.ExtensionContext): void {
    AnalyticsService.initialize(context);
    const service = AnalyticsService.getInstance();
    const sessionInfo = service.getSessionInfo();
    console.log('Quick test - Session ID:', sessionInfo.sessionId);
    console.log('Quick test - Session Duration:', sessionInfo.duration, 'ms');
}