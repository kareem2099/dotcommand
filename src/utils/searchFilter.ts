import { workspace } from 'vscode';

/**
 * Search and filter state interface
 */
export interface SearchFilterState {
  searchText: string;
  selectedCategories: string[];
  isActive: boolean;
}

/**
 * Default search filter state
 */
export const DEFAULT_SEARCH_FILTER_STATE: SearchFilterState = {
  searchText: '',
  selectedCategories: [],
  isActive: false
};

/**
 * Storage keys for persisting filter states
 */
export const STORAGE_KEYS = {
  PREPARED_COMMANDS_FILTER: 'dotcommand.preparedCommands.filter',
  MY_COMMANDS_FILTER: 'dotcommand.myCommands.filter'
};

/**
 * Load filter state from workspace storage
 */
export function loadFilterState(storageKey: string): SearchFilterState {
  const stored = workspace.getConfiguration().get(storageKey) as SearchFilterState | undefined;
  return stored || { ...DEFAULT_SEARCH_FILTER_STATE };
}

/**
 * Save filter state to workspace storage
 */
export function saveFilterState(storageKey: string, state: SearchFilterState): void {
  workspace.getConfiguration().update(storageKey, state, true);
}

/**
 * Clear filter state
 */
export function clearFilterState(storageKey: string): void {
  saveFilterState(storageKey, { ...DEFAULT_SEARCH_FILTER_STATE });
}

/**
 * Check if a prepared command matches the search criteria
 */
export function matchesPreparedCommandSearch(
  command: { name: string; command: string; description: string; category: string },
  searchText: string,
  selectedCategories: string[]
): boolean {
  // Category filter
  if (selectedCategories.length > 0 && !selectedCategories.includes(command.category)) {
    return false;
  }

  // Text search
  if (!searchText.trim()) {
    return true; // No search text = match all
  }

  const searchLower = searchText.toLowerCase();
  return (
    command.name.toLowerCase().includes(searchLower) ||
    command.command.toLowerCase().includes(searchLower) ||
    command.description.toLowerCase().includes(searchLower) ||
    command.category.toLowerCase().includes(searchLower)
  );
}

/**
 * Check if a saved command matches the search criteria
 */
export function matchesSavedCommandSearch(
  command: { name?: string; command: string; category?: string },
  searchText: string,
  selectedCategories: string[]
): boolean {
  // Category filter
  if (selectedCategories.length > 0 && command.category && !selectedCategories.includes(command.category)) {
    return false;
  }

  // Text search
  if (!searchText.trim()) {
    return true; // No search text = match all
  }

  const searchLower = searchText.toLowerCase();
  return (
    (command.name ? command.name.toLowerCase().includes(searchLower) : false) ||
    command.command.toLowerCase().includes(searchLower) ||
    (command.category ? command.category.toLowerCase().includes(searchLower) : false)
  );
}

/**
 * Filter prepared commands based on search/filter state
 */
export function filterPreparedCommands(
  commands: { name: string; command: string; description: string; category: string }[],
  state: SearchFilterState
): { name: string; command: string; description: string; category: string }[] {
  if (!state.isActive) {
    return commands;
  }

  return commands.filter(cmd =>
    matchesPreparedCommandSearch(cmd, state.searchText, state.selectedCategories)
  );
}

/**
 * Filter saved commands based on search/filter state
 */
export function filterSavedCommands<T extends { name?: string; command: string; category?: string }>(
  commands: T[],
  state: SearchFilterState
): T[] {
  if (!state.isActive) {
    return commands;
  }

  return commands.filter(cmd =>
    matchesSavedCommandSearch(cmd, state.searchText, state.selectedCategories)
  );
}

/**
 * Get unique categories from prepared commands
 */
export function getPreparedCommandCategories(commands: { category: string }[]): string[] {
  const categories = commands.map(cmd => cmd.category);
  return [...new Set(categories)].sort();
}

/**
 * Get unique categories from saved commands
 */
export function getSavedCommandCategories(commands: { category?: string }[]): string[] {
  const categories = commands
    .map(cmd => cmd.category)
    .filter((cat): cat is string => cat !== undefined && cat !== '');
  return [...new Set(categories)].sort();
}
