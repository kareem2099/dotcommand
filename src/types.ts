export interface SavedCommand {
  id: string;
  name?: string;
  command: string;
  category?: string;
  timestamp: number;
  lastUsed?: number;
  usageCount?: number;
  isFavorite?: boolean;
  source?: 'manual' | 'auto-terminal' | 'terminal-history';
  deletedAt?: number; // Soft delete timestamp
}

export interface CommandInput {
  command: string;
  name?: string;
  category?: string;
  usageCount?: number;
  lastUsed?: number;
  isFavorite?: boolean;
  source?: 'manual' | 'auto-terminal' | 'terminal-history';
  deletedAt?: number;
}
