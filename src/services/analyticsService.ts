import * as vscode from 'vscode';

/**
 * Analytics Event Types
 */
export type AnalyticsEventType = 
  | 'suggestion_shown'
  | 'suggestion_clicked'
  | 'suggestion_accepted'
  | 'suggestion_dismissed'
  | 'command_executed'
  | 'command_saved'
  | 'template_executed'
  | 'context_detected'
  | 'performance_metric'
  | 'session_event'
  | 'command_result'
  | 'context_accuracy';

/**
 * Analytics Event Interface
 */
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  data: Record<string, unknown>;
  responseTimeMs?: number;
}

/**
 * Performance Metric Interface
 */
export interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Suggestion Analytics Interface
 */
export interface SuggestionAnalytics {
  suggestionId: string;
  shown: number;
  clicked: number;
  accepted: number;
  dismissed: number;
  lastShown: number;
  lastClicked?: number;
  lastAccepted?: number;
}

/**
 * Category Preference Interface
 */
export interface CategoryPreference {
  category: string;
  usageCount: number;
  lastUsed: number;
  preferenceScore: number;
}

/**
 * Command Result Interface
 */
export interface CommandResult {
  commandId: string;
  success: boolean;
  errorType?: string;
  executionTime: number;
  timestamp: number;
}

/**
 * Context Accuracy Interface
 */
export interface ContextAccuracy {
  contextType: string;
  correct: boolean;
  userCorrection?: string;
  timestamp: number;
}

/**
 * Analytics Summary Interface
 */
export interface AnalyticsSummary {
  totalSuggestionsShown: number;
  totalSuggestionsClicked: number;
  totalSuggestionsAccepted: number;
  acceptanceRate: number;
  clickThroughRate: number;
  topCategories: CategoryPreference[];
  topSuggestions: SuggestionAnalytics[];
  averageResponseTime: number;
  commandSuccessRate: number;
  contextAccuracyRate: number;
  period: { start: number; end: number };
}

/**
 * AnalyticsService - Tracks user behavior and suggestion performance
 * 
 * Stores analytics in globalState with 90-day retention
 * Privacy-first: all data stored locally
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private context: vscode.ExtensionContext;
  
  // Storage keys
  private readonly EVENTS_KEY = 'dotcommand.analyticsEvents';
  private readonly SUGGESTION_STATS_KEY = 'dotcommand.suggestionStats';
  private readonly CATEGORY_PREFERENCES_KEY = 'dotcommand.categoryPreferences';
  private readonly PERFORMANCE_KEY = 'dotcommand.performanceMetrics';
  private readonly COMMAND_RESULTS_KEY = 'dotcommand.commandResults';
  private readonly CONTEXT_ACCURACY_KEY = 'dotcommand.contextAccuracy';
  private readonly SESSION_KEY = 'dotcommand.currentSession';
  
  // Retention settings
  private readonly RETENTION_DAYS = 90;
  private readonly MAX_EVENTS = 10000;
  private readonly MAX_COMMAND_RESULTS = 1000;
  
  // Performance tracking
  private performanceTimers: Map<string, number> = new Map();

  // Session tracking
  private sessionId: string = '';
  private sessionStart: number = 0;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    // Initialize session
    this.initializeSession();
    // Clean old data on initialization
    this.cleanupOldData();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(context?: vscode.ExtensionContext): AnalyticsService {
    if (!AnalyticsService.instance) {
      if (!context) {
        throw new Error('AnalyticsService requires context on first initialization');
      }
      AnalyticsService.instance = new AnalyticsService(context);
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize with context (for use in extension.ts)
   */
  public static initialize(context: vscode.ExtensionContext): AnalyticsService {
    AnalyticsService.instance = new AnalyticsService(context);
    return AnalyticsService.instance;
  }

  // ==================== SESSION TRACKING ====================

  /**
   * Initialize a new session
   */
  private initializeSession(): void {
    const existingSession = this.context.globalState.get<{ sessionId: string; startTime: number }>(this.SESSION_KEY);
    
    // Check if session is still valid (within last hour)
    if (existingSession && existingSession.startTime > Date.now() - 3600000) {
      this.sessionId = existingSession.sessionId;
      this.sessionStart = existingSession.startTime;
    } else {
      // Create new session
      this.sessionId = this.generateSessionId();
      this.sessionStart = Date.now();
      this.context.globalState.update(this.SESSION_KEY, {
        sessionId: this.sessionId,
        startTime: this.sessionStart
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session info
   */
  public getSessionInfo(): { sessionId: string; duration: number } {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStart
    };
  }

  /**
   * Track session event
   */
  public trackSessionEvent(event: string, data?: Record<string, unknown>): void {
    this.trackEvent('session_event', {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStart,
      event,
      ...data
    });
  }

  // ==================== EVENT TRACKING ====================

  /**
   * Track a suggestion was shown to user
   */
  public trackSuggestionShown(suggestionId: string, context: Record<string, unknown> = {}): void {
    this.trackEvent('suggestion_shown', {
      suggestionId,
      ...context
    });

    // Update suggestion stats
    this.updateSuggestionStats(suggestionId, 'shown');
  }

  /**
   * Track a suggestion was clicked by user
   */
  public trackSuggestionClicked(suggestionId: string, context: Record<string, unknown> = {}): void {
    this.trackEvent('suggestion_clicked', { suggestionId, ...context });
    this.updateSuggestionStats(suggestionId, 'clicked');
  }

  /**
   * Track a suggestion was accepted/executed
   */
  public trackSuggestionAccepted(suggestionId: string, context: Record<string, unknown> = {}): void {
    this.trackEvent('suggestion_accepted', { suggestionId, ...context });
    this.updateSuggestionStats(suggestionId, 'accepted');
  }

  /**
   * Track a suggestion was dismissed
   */
  public trackSuggestionDismissed(suggestionId: string, context: Record<string, unknown> = {}): void {
    this.trackEvent('suggestion_dismissed', { suggestionId, ...context });
    this.updateSuggestionStats(suggestionId, 'dismissed');
  }

  /**
   * Track command execution
   */
  public trackCommandExecuted(command: string, category?: string, source?: string): void {
    this.trackEvent('command_executed', {
      command,
      category,
      source
    });
    this.updateCategoryPreference(category || 'uncategorized');
  }

  /**
   * Track command saved
   */
  public trackCommandSaved(command: string, category?: string): void {
    this.trackEvent('command_saved', { command, category });
  }

  /**
   * Track template execution
   */
  public trackTemplateExecuted(templateId: string, templateName: string, category?: string): void {
    this.trackEvent('template_executed', { templateId, templateName, category });
    this.updateCategoryPreference(category || 'templates');
  }

  /**
   * Track context detected
   */
  public trackContextDetected(contextType: string, detected: boolean, details?: Record<string, unknown>): void {
    this.trackEvent('context_detected', { contextType, detected, ...details });
  }

  // ==================== COMMAND SUCCESS RATE ====================

  /**
   * Track command execution result
   */
  public trackCommandResult(result: CommandResult): void {
    this.trackEvent('command_result', {
      commandId: result.commandId,
      success: result.success,
      errorType: result.errorType,
      executionTime: result.executionTime
    });
    this.storeCommandResult(result);
  }

  /**
   * Store command result
   */
  private storeCommandResult(result: CommandResult): void {
    const results = this.getCommandResults();
    results.push({ ...result, timestamp: Date.now() });
    
    // Keep last MAX_COMMAND_RESULTS
    if (results.length > this.MAX_COMMAND_RESULTS) {
      results.splice(0, results.length - this.MAX_COMMAND_RESULTS);
    }
    
    this.context.globalState.update(this.COMMAND_RESULTS_KEY, results);
  }

  /**
   * Get command results
   */
  public getCommandResults(): CommandResult[] {
    return this.context.globalState.get<CommandResult[]>(this.COMMAND_RESULTS_KEY, []) || [];
  }

  /**
   * Get command success rate
   */
  public getCommandSuccessRate(): number {
    const results = this.getCommandResults();
    if (results.length === 0) return 0;
    
    const successful = results.filter(r => r.success).length;
    return (successful / results.length) * 100;
  }

  // ==================== CONTEXT ACCURACY ====================

  /**
   * Track context accuracy
   */
  public trackContextAccuracy(contextType: string, wasCorrect: boolean, userCorrection?: string): void {
    this.trackEvent('context_accuracy', {
      contextType,
      wasCorrect,
      userCorrection
    });
    
    const accuracy: ContextAccuracy = {
      contextType,
      correct: wasCorrect,
      userCorrection,
      timestamp: Date.now()
    };
    
    this.storeContextAccuracy(accuracy);
  }

  /**
   * Store context accuracy
   */
  private storeContextAccuracy(accuracy: ContextAccuracy): void {
    const accuracies = this.getContextAccuracies();
    accuracies.push(accuracy);
    
    // Keep last 500
    if (accuracies.length > 500) {
      accuracies.splice(0, accuracies.length - 500);
    }
    
    this.context.globalState.update(this.CONTEXT_ACCURACY_KEY, accuracies);
  }

  /**
   * Get context accuracies
   */
  public getContextAccuracies(): ContextAccuracy[] {
    return this.context.globalState.get<ContextAccuracy[]>(this.CONTEXT_ACCURACY_KEY, []) || [];
  }

  /**
   * Get context accuracy rate
   */
  public getContextAccuracyRate(): number {
    const accuracies = this.getContextAccuracies();
    if (accuracies.length === 0) return 0;
    
    const correct = accuracies.filter(a => a.correct).length;
    return (correct / accuracies.length) * 100;
  }

  // ==================== PERFORMANCE TRACKING ====================

  /**
   * Start performance timer for an operation
   */
  public startTimer(operationId: string): void {
    this.performanceTimers.set(operationId, Date.now());
  }

  /**
   * End performance timer and track the metric
   */
  public endTimer(operationId: string, success: boolean = true, metadata?: Record<string, unknown>): number | null {
    const startTime = this.performanceTimers.get(operationId);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationId}`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    this.performanceTimers.delete(operationId);

    this.trackPerformanceMetric({
      operation: operationId,
      startTime,
      endTime,
      duration,
      success,
      metadata
    });

    return duration;
  }

  /**
   * Track a performance metric directly
   */
  public trackPerformanceMetric(metric: PerformanceMetric): void {
    this.trackEvent('performance_metric', {
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      ...metric.metadata
    }, metric.duration);

    this.storePerformanceMetric(metric);
  }

  // ==================== CORE EVENT TRACKING ====================

  /**
   * Track a generic event
   */
  private trackEvent(type: AnalyticsEventType, data: Record<string, unknown>, responseTimeMs?: number): void {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      type,
      timestamp: Date.now(),
      data,
      responseTimeMs
    };

    const events = this.getEvents();
    events.push(event);

    // Trim if too many events
    if (events.length > this.MAX_EVENTS) {
      events.splice(0, events.length - this.MAX_EVENTS);
    }

    this.saveEvents(events);
  }

  // ==================== SUGGESTION STATS ====================

  /**
   * Update suggestion statistics
   */
  private updateSuggestionStats(suggestionId: string, action: 'shown' | 'clicked' | 'accepted' | 'dismissed'): void {
    const stats = this.getSuggestionStats();
    let suggestion = stats.find(s => s.suggestionId === suggestionId);

    if (!suggestion) {
      suggestion = {
        suggestionId,
        shown: 0,
        clicked: 0,
        accepted: 0,
        dismissed: 0,
        lastShown: 0
      };
      stats.push(suggestion);
    }

    suggestion.lastShown = Date.now();

    switch (action) {
      case 'shown':
        suggestion.shown++;
        break;
      case 'clicked':
        suggestion.clicked++;
        suggestion.lastClicked = Date.now();
        break;
      case 'accepted':
        suggestion.accepted++;
        suggestion.lastAccepted = Date.now();
        break;
      case 'dismissed':
        suggestion.dismissed++;
        break;
    }

    this.saveSuggestionStats(stats);
  }

  /**
   * Get suggestion statistics
   */
  public getSuggestionStats(): SuggestionAnalytics[] {
    return this.context.globalState.get<SuggestionAnalytics[]>(this.SUGGESTION_STATS_KEY, []) || [];
  }

  /**
   * Save suggestion statistics
   */
  private saveSuggestionStats(stats: SuggestionAnalytics[]): void {
    this.context.globalState.update(this.SUGGESTION_STATS_KEY, stats);
  }

  // ==================== CATEGORY PREFERENCES ====================

  /**
   * Update category preference based on usage
   */
  private updateCategoryPreference(category: string): void {
    const preferences = this.getCategoryPreferences();
    let categoryPref = preferences.find(p => p.category === category);

    if (!categoryPref) {
      categoryPref = {
        category,
        usageCount: 0,
        lastUsed: 0,
        preferenceScore: 0
      };
      preferences.push(categoryPref);
    }

    categoryPref.usageCount++;
    categoryPref.lastUsed = Date.now();
    
    // Calculate preference score: more weight to recent usage
    const daysSinceLastUse = (Date.now() - categoryPref.lastUsed) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSinceLastUse / 30)); // Decay over 30 days
    categoryPref.preferenceScore = (categoryPref.usageCount * 0.7) + (recencyScore * 30);

    this.saveCategoryPreferences(preferences);
  }

  /**
   * Get category preferences
   */
  public getCategoryPreferences(): CategoryPreference[] {
    return this.context.globalState.get<CategoryPreference[]>(this.CATEGORY_PREFERENCES_KEY, []) || [];
  }

  /**
   * Save category preferences
   */
  private saveCategoryPreferences(preferences: CategoryPreference[]): void {
    this.context.globalState.update(this.CATEGORY_PREFERENCES_KEY, preferences);
  }

  /**
   * Get category preference score for a category
   */
  public getCategoryPreferenceScore(category: string): number {
    const preferences = this.getCategoryPreferences();
    const pref = preferences.find(p => p.category === category);
    return pref?.preferenceScore || 0;
  }

  // ==================== PERFORMANCE METRICS ====================

  /**
   * Store performance metric
   */
  private storePerformanceMetric(metric: PerformanceMetric): void {
    const metrics = this.getPerformanceMetrics();
    metrics.push(metric);

    // Keep last 1000 metrics
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    this.savePerformanceMetrics(metrics);
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetric[] {
    return this.context.globalState.get<PerformanceMetric[]>(this.PERFORMANCE_KEY, []) || [];
  }

  /**
   * Save performance metrics
   */
  private savePerformanceMetrics(metrics: PerformanceMetric[]): void {
    this.context.globalState.update(this.PERFORMANCE_KEY, metrics);
  }

  /**
   * Get average response time for an operation
   */
  public getAverageResponseTime(operation?: string): number {
    const metrics = this.getPerformanceMetrics();
    
    let filtered = metrics;
    if (operation) {
      filtered = metrics.filter(m => m.operation === operation);
    }

    if (filtered.length === 0) return 0;

    const total = filtered.reduce((sum, m) => sum + m.duration, 0);
    return total / filtered.length;
  }

  // ==================== ANALYTICS SUMMARY ====================

  /**
   * Get analytics summary for a time period
   */
  public getAnalyticsSummary(days: number = 30): AnalyticsSummary {
    const events = this.getEvents();
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const recentEvents = events.filter(e => e.timestamp >= cutoff);
    
    const suggestionsShown = recentEvents.filter(e => e.type === 'suggestion_shown').length;
    const suggestionsClicked = recentEvents.filter(e => e.type === 'suggestion_clicked').length;
    const suggestionsAccepted = recentEvents.filter(e => e.type === 'suggestion_accepted').length;

    const topCategories = this.getCategoryPreferences()
      .sort((a, b) => b.preferenceScore - a.preferenceScore)
      .slice(0, 10);

    const topSuggestions = this.getSuggestionStats()
      .sort((a, b) => (b.accepted + b.clicked) - (a.accepted + a.clicked))
      .slice(0, 10);

    const avgResponseTime = this.getAverageResponseTime();
    const commandSuccessRate = this.getCommandSuccessRate();
    const contextAccuracyRate = this.getContextAccuracyRate();

    return {
      totalSuggestionsShown: suggestionsShown,
      totalSuggestionsClicked: suggestionsClicked,
      totalSuggestionsAccepted: suggestionsAccepted,
      acceptanceRate: suggestionsShown > 0 ? (suggestionsAccepted / suggestionsShown) * 100 : 0,
      clickThroughRate: suggestionsShown > 0 ? (suggestionsClicked / suggestionsShown) * 100 : 0,
      topCategories,
      topSuggestions,
      averageResponseTime: avgResponseTime,
      commandSuccessRate,
      contextAccuracyRate,
      period: { start: cutoff, end: Date.now() }
    };
  }

  // ==================== EVENT STORAGE ====================

  /**
   * Get all events
   */
  private getEvents(): AnalyticsEvent[] {
    return this.context.globalState.get<AnalyticsEvent[]>(this.EVENTS_KEY, []) || [];
  }

  /**
   * Save events
   */
  private saveEvents(events: AnalyticsEvent[]): void {
    this.context.globalState.update(this.EVENTS_KEY, events);
  }

  // ==================== DATA CLEANUP ====================

  /**
   * Clean up old analytics data (older than retention period)
   */
  public cleanupOldData(): void {
    const cutoff = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    // Clean events
    const events = this.getEvents();
    const filteredEvents = events.filter(e => e.timestamp >= cutoff);
    if (filteredEvents.length !== events.length) {
      this.saveEvents(filteredEvents);
      console.log(`Analytics cleanup: removed ${events.length - filteredEvents.length} old events`);
    }

    // Clean performance metrics
    const metrics = this.getPerformanceMetrics();
    const filteredMetrics = metrics.filter(m => m.startTime >= cutoff);
    if (filteredMetrics.length !== metrics.length) {
      this.savePerformanceMetrics(filteredMetrics);
      console.log(`Analytics cleanup: removed ${metrics.length - filteredMetrics.length} old metrics`);
    }
  }

  /**
   * Clear all analytics data
   */
  public clearAllData(): void {
    this.context.globalState.update(this.EVENTS_KEY, []);
    this.context.globalState.update(this.SUGGESTION_STATS_KEY, []);
    this.context.globalState.update(this.CATEGORY_PREFERENCES_KEY, []);
    this.context.globalState.update(this.PERFORMANCE_KEY, []);
    this.context.globalState.update(this.COMMAND_RESULTS_KEY, []);
    this.context.globalState.update(this.CONTEXT_ACCURACY_KEY, []);
    console.log('All analytics data cleared');
  }

  // ==================== UTILITIES ====================

  /**
   * Generate unique ID for events
   */
  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get exportable analytics data
   */
  public exportData(): string {
    const summary = this.getAnalyticsSummary(90);
    const data = {
      exportDate: new Date().toISOString(),
      summary,
      categoryPreferences: this.getCategoryPreferences(),
      suggestionStats: this.getSuggestionStats(),
      commandResults: this.getCommandResults(),
      contextAccuracies: this.getContextAccuracies(),
      retentionDays: this.RETENTION_DAYS
    };
    return JSON.stringify(data, null, 2);
  }
}

/**
 * Initialize analytics service
 */
export function initializeAnalyticsService(context: vscode.ExtensionContext): AnalyticsService {
  return AnalyticsService.initialize(context);
}

/**
 * Get analytics service instance
 */
export function getAnalyticsService(): AnalyticsService {
  return AnalyticsService.getInstance();
}
