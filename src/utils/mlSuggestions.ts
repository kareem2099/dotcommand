import * as vscode from 'vscode';

/**
 * ML Suggestion Interface
 */
export interface MLSuggestionItem {
  id: string;
  name: string;
  command: string;
  category?: string;
  score: number;
  factors: {
    frequency: number;
    recency: number;
    category: number;
    context: number;
    analytics: number;
  };
}

/**
 * ML Scoring Configuration
 */
export interface MLScoringConfig {
  frequencyWeight: number;  // Weight for usage frequency (default: 0.3)
  recencyWeight: number;    // Weight for recency (default: 0.3)
  categoryWeight: number;   // Weight for category preference (default: 0.2)
  contextWeight: number;    // Weight for context match (default: 0.1)
  analyticsWeight: number;  // Weight for analytics data (default: 0.1)
}

/**
 * Default ML Configuration
 */
const DEFAULT_CONFIG: MLScoringConfig = {
  frequencyWeight: 0.3,
  recencyWeight: 0.3,
  categoryWeight: 0.2,
  contextWeight: 0.1,
  analyticsWeight: 0.1
};

/**
 * MLSuggestions - Statistical ML-based suggestion improvements
 * 
 * Uses weighted scoring algorithm combining:
 * - Usage frequency (how often a command is used)
 * - Recency (when it was last used)
 * - Category preference (user's preferred categories)
 * - Context match (current project context)
 * - Analytics data (clicks, acceptance rates)
 */
export class MLSuggestions {
  private static instance: MLSuggestions;
  private config: MLScoringConfig;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.config = this.loadConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(context?: vscode.ExtensionContext): MLSuggestions {
    if (!MLSuggestions.instance) {
      if (!context) {
        throw new Error('MLSuggestions requires context on first initialization');
      }
      MLSuggestions.instance = new MLSuggestions(context);
    }
    return MLSuggestions.instance;
  }

  /**
   * Initialize with context
   */
  public static initialize(context: vscode.ExtensionContext): MLSuggestions {
    MLSuggestions.instance = new MLSuggestions(context);
    return MLSuggestions.instance;
  }

  /**
   * Load configuration from settings
   */
  private loadConfig(): MLScoringConfig {
    const config = vscode.workspace.getConfiguration('dotcommand');
    
    return {
      frequencyWeight: config.get<number>('ml.frequencyWeight') ?? DEFAULT_CONFIG.frequencyWeight,
      recencyWeight: config.get<number>('ml.recencyWeight') ?? DEFAULT_CONFIG.recencyWeight,
      categoryWeight: config.get<number>('ml.categoryWeight') ?? DEFAULT_CONFIG.categoryWeight,
      contextWeight: config.get<number>('ml.contextWeight') ?? DEFAULT_CONFIG.contextWeight,
      analyticsWeight: config.get<number>('ml.analyticsWeight') ?? DEFAULT_CONFIG.analyticsWeight
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): MLScoringConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<MLScoringConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ==================== SCORING ALGORITHM ====================

  /**
   * Calculate ML score for a suggestion
   */
  public async calculateScore(
    item: { id: string; name: string; command: string; category?: string },
    context?: {
      currentCategory?: string;
      recentCommands?: string[];
      activeProject?: string;
    }
  ): Promise<MLSuggestionItem> {
    // Get individual factor scores
    const frequencyScore = await this.getFrequencyScore(item.command);
    const recencyScore = await this.getRecencyScore(item.command);
    const categoryScore = this.getCategoryScore(item.category, context?.currentCategory);
    const contextScore = this.getContextScore(item, context);
    const analyticsScore = await this.getAnalyticsScore(item.id);

    // Calculate weighted total
    const totalScore = 
      (frequencyScore * this.config.frequencyWeight) +
      (recencyScore * this.config.recencyWeight) +
      (categoryScore * this.config.categoryWeight) +
      (contextScore * this.config.contextWeight) +
      (analyticsScore * this.config.analyticsWeight);

    return {
      id: item.id,
      name: item.name,
      command: item.command,
      category: item.category,
      score: Math.round(totalScore * 100) / 100,
      factors: {
        frequency: Math.round(frequencyScore * 100) / 100,
        recency: Math.round(recencyScore * 100) / 100,
        category: Math.round(categoryScore * 100) / 100,
        context: Math.round(contextScore * 100) / 100,
        analytics: Math.round(analyticsScore * 100) / 100
      }
    };
  }

  /**
   * Get frequency score (0-1) based on usage count
   */
  private async getFrequencyScore(command: string): Promise<number> {
    try {
      // Import analytics service
      const { getAnalyticsService } = await import('../services/analyticsService');
      const analytics = getAnalyticsService();
      
      const stats = analytics.getSuggestionStats();
      const item = stats.find(s => s.suggestionId === command);
      
      if (!item || item.accepted === 0) return 0.1; // Default low score
      
      // Normalize: 100+ uses = 1.0, 0 uses = 0.1
      const normalized = Math.min(1, item.accepted / 100);
      return 0.1 + (normalized * 0.9);
    } catch {
      return 0.1;
    }
  }

  /**
   * Get recency score (0-1) based on last used
   */
  private async getRecencyScore(command: string): Promise<number> {
    try {
      const { getAnalyticsService } = await import('../services/analyticsService');
      const analytics = getAnalyticsService();
      
      const stats = analytics.getSuggestionStats();
      const item = stats.find(s => s.suggestionId === command);
      
      if (!item || !item.lastAccepted) return 0.1;
      
      // Calculate days since last use
      const daysSince = (Date.now() - item.lastAccepted) / (1000 * 60 * 60 * 24);
      
      // Decay over 30 days: 0 days = 1.0, 30+ days = 0.1
      const score = Math.max(0.1, 1 - (daysSince / 30));
      return score;
    } catch  {
      return 0.1;
    }
  }

  /**
   * Get category score (0-1) based on user preferences
   */
  private getCategoryScore(itemCategory?: string, currentCategory?: string): number {
    if (!itemCategory || !currentCategory) return 0.5;
    
    // Exact match = 1.0
    if (itemCategory.toLowerCase() === currentCategory.toLowerCase()) {
      return 1.0;
    }
    
    // Check for partial match
    const itemWords = itemCategory.toLowerCase().split(/[-_\s]/);
    const currentWords = currentCategory.toLowerCase().split(/[-_\s]/);
    
    const intersection = itemWords.filter(w => currentWords.includes(w));
    if (intersection.length > 0) {
      return 0.5 + (intersection.length / Math.max(itemWords.length, currentWords.length)) * 0.5;
    }
    
    return 0.1;
  }

  /**
   * Get context score (0-1) based on current project context
   */
  private getContextScore(
    item: { id: string; name: string; command: string; category?: string },
    context?: {
      currentCategory?: string;
      recentCommands?: string[];
      activeProject?: string;
    }
  ): number {
    if (!context || !context.recentCommands) return 0.5;
    
    // Check if command was recently used
    if (context.recentCommands.includes(item.command)) {
      return 1.0;
    }
    
    // Check if similar command was used (command prefix match)
    const prefix = item.command.split(' ')[0];
    const similarUsed = context.recentCommands.some(cmd => cmd.startsWith(prefix));
    if (similarUsed) {
      return 0.7;
    }
    
    return 0.5;
  }

  /**
   * Get analytics score (0-1) based on click/acceptance rates
   */
  private async getAnalyticsScore(suggestionId: string): Promise<number> {
    try {
      const { getAnalyticsService } = await import('../services/analyticsService');
      const analytics = getAnalyticsService();
      
      const stats = analytics.getSuggestionStats();
      const item = stats.find(s => s.suggestionId === suggestionId);
      
      if (!item || item.shown === 0) return 0.5;
      
      // Calculate acceptance rate
      const acceptanceRate = item.accepted / item.shown;
      return Math.min(1, acceptanceRate * 2); // 50% acceptance = 1.0
    } catch  {
      return 0.5;
    }
  }

  // ==================== BATCH SCORING ====================

  /**
   * Score multiple items and return sorted by score
   */
  public async scoreAndSort(
    items: { id: string; name: string; command: string; category?: string }[],
    context?: {
      currentCategory?: string;
      recentCommands?: string[];
      activeProject?: string;
    }
  ): Promise<MLSuggestionItem[]> {
    const scored = await Promise.all(
      items.map(item => this.calculateScore(item, context))
    );
    
    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Get top N suggestions
   */
  public async getTopSuggestions(
    items: { id: string; name: string; command: string; category?: string }[],
    n: number = 5,
    context?: {
      currentCategory?: string;
      recentCommands?: string[];
      activeProject?: string;
    }
  ): Promise<MLSuggestionItem[]> {
    const scored = await this.scoreAndSort(items, context);
    return scored.slice(0, n);
  }

  // ==================== INSIGHTS ====================

  /**
   * Get recommendation insights for a command
   */
  public async getInsights(command: string): Promise<{
    score: number;
    factors: string[];
    recommendation: string;
  }> {
    const score = await this.getFrequencyScore(command);
    const factors: string[] = [];
    
    if (score > 0.7) {
      factors.push('Frequently used');
    } else if (score > 0.4) {
      factors.push('Occasionally used');
    } else {
      factors.push('Rarely used');
    }
    
    const recency = await this.getRecencyScore(command);
    if (recency > 0.7) {
      factors.push('Recently used');
    } else if (recency < 0.3) {
      factors.push('Not used recently');
    }
    
    let recommendation = '';
    if (score > 0.7 && recency > 0.7) {
      recommendation = 'Highly recommended - frequently and recently used';
    } else if (score > 0.5) {
      recommendation = 'Good suggestion based on usage patterns';
    } else if (recency > 0.7) {
      recommendation = 'Recently used - may be relevant';
    } else {
      recommendation = 'Standard suggestion - limited usage data';
    }
    
    return {
      score: Math.round((score + recency) * 50),
      factors,
      recommendation
    };
  }

  // ==================== LEARNING ====================

  /**
   * Record positive interaction (user selected this suggestion)
   */
  public async recordPositive(suggestionId: string): Promise<void> {
    try {
      const { getAnalyticsService } = await import('../services/analyticsService');
      const analytics = getAnalyticsService();
      
      // Track positive interaction via analytics service
      analytics.trackSuggestionAccepted(suggestionId);
      console.log(`ML: Positive interaction recorded for ${suggestionId}`);
    } catch (error) {
      console.error('Error recording positive interaction:', error);
    }
  }

  /**
   * Record negative interaction (user dismissed this suggestion)
   */
  public async recordNegative(suggestionId: string): Promise<void> {
    try {
      const { getAnalyticsService } = await import('../services/analyticsService');
      const analytics = getAnalyticsService();
      
      analytics.trackSuggestionDismissed(suggestionId);
      console.log(`ML: Negative interaction recorded for ${suggestionId}`);
    } catch (error) {
      console.error('Error recording negative interaction:', error);
    }
  }

  // ==================== CONFIGURATION ====================

  /**
   * Reset to default configuration
   */
  public resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get configuration as JSON string
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  public importConfig(json: string): boolean {
    try {
      const config = JSON.parse(json);
      this.config = { ...DEFAULT_CONFIG, ...config };
      return true;
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  }
}

/**
 * Initialize ML Suggestions
 */
export function initializeMLSuggestions(context: vscode.ExtensionContext): MLSuggestions {
  return MLSuggestions.initialize(context);
}

/**
 * Get ML Suggestions instance
 */
export function getMLSuggestions(): MLSuggestions {
  return MLSuggestions.getInstance();
}
