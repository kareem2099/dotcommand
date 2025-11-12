import { window, QuickPickItem, TreeView, TreeItem } from 'vscode';
import { PreparedCommandsTreeDataProvider } from '../providers/preparedCommandsTreeDataProvider';
import { CommandsTreeDataProvider } from '../providers/treeView';
import { SearchFilterState, getSavedCommandCategories } from '../utils/searchFilter';
import { getPreparedCommandCategories } from '../commands/prepared';

interface SearchFilterQuickPickItem extends QuickPickItem {
  action?: 'search' | 'filter' | 'clear';
  category?: string;
}

let preparedTreeDataProvider: PreparedCommandsTreeDataProvider;
let myCommandsTreeDataProvider: CommandsTreeDataProvider;
let preparedTreeView: TreeView<TreeItem>;
let myCommandsTreeView: TreeView<TreeItem>;

/**
 * Initialize search/filter handlers with required dependencies
 */
export function initializeSearchFilterHandlers(
  preparedProvider: PreparedCommandsTreeDataProvider,
  myCommandsProvider: CommandsTreeDataProvider,
  preparedView: TreeView<TreeItem>,
  myCommandsView: TreeView<TreeItem>
) {
  preparedTreeDataProvider = preparedProvider;
  myCommandsTreeDataProvider = myCommandsProvider;
  preparedTreeView = preparedView;
  myCommandsTreeView = myCommandsView;
}

/**
 * Handle search/filter for prepared commands
 */
export async function handleSearchPreparedCommands(): Promise<void> {
  const currentState = preparedTreeDataProvider.getSearchFilterState();
  const newState = await showSearchFilterInterface('prepared', currentState);

  if (newState) {
    preparedTreeDataProvider.setSearchFilterState(newState);
  }
}

/**
 * Handle search/filter for my commands
 */
export async function handleSearchMyCommands(): Promise<void> {
  const currentState = myCommandsTreeDataProvider.getSearchFilterState();
  const newState = await showSearchFilterInterface('myCommands', currentState);

  if (newState) {
    myCommandsTreeDataProvider.setSearchFilterState(newState);
  }
}

/**
 * Handle clearing filters for prepared commands
 */
export async function handleClearPreparedFilters(): Promise<void> {
  preparedTreeDataProvider.clearSearchFilter();
  window.showInformationMessage('Cleared all filters for Prepared Commands');
}

/**
 * Handle clearing filters for my commands
 */
export async function handleClearMyCommandsFilters(): Promise<void> {
  myCommandsTreeDataProvider.clearSearchFilter();
  window.showInformationMessage('Cleared all filters for My Commands');
}

/**
 * Show the search/filter interface
 */
async function showSearchFilterInterface(
  viewType: 'prepared' | 'myCommands',
  currentState: SearchFilterState
): Promise<SearchFilterState | undefined> {
  const continueLoop = true;
  let state = { ...currentState };

  while (continueLoop) {
    const options: SearchFilterQuickPickItem[] = [
      {
        label: `$(search) Search Commands`,
        description: state.searchText ? `Current: "${state.searchText}"` : 'Enter text to search',
        detail: 'Search by command name, description, or content',
        action: 'search'
      },
      {
        label: `$(filter) Filter by Category`,
        description: state.selectedCategories.length > 0
          ? `${state.selectedCategories.length} selected`
          : 'Select categories to show',
        detail: 'Filter commands by category',
        action: 'filter'
      },
      {
        label: `$(clear-all) Clear All Filters`,
        description: 'Remove all search and filter criteria',
        detail: 'Show all commands',
        action: 'clear'
      }
    ];

    const selectedOption = await window.showQuickPick(options, {
      placeHolder: `Search and filter ${viewType === 'prepared' ? 'prepared' : 'my'} commands`,
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedOption) {
      return undefined; // User cancelled
    }

    if (selectedOption.action === 'search') {
      const searchInput = await window.showInputBox({
        prompt: 'Enter search terms',
        placeHolder: 'Search by name, command, description, or category...',
        value: state.searchText
      });

      if (searchInput !== undefined) {
        state.searchText = searchInput.trim();
        state.isActive = state.searchText.length > 0 || state.selectedCategories.length > 0;
        return state;
      }
    } else if (selectedOption.action === 'filter') {
      const categories = viewType === 'prepared'
        ? getPreparedCommandCategories()
        : getSavedCommandCategories(myCommandsTreeDataProvider.getAllCommands());

      if (categories.length === 0) {
        window.showInformationMessage('No categories available to filter');
        continue;
      }

      const categorySelections = await window.showQuickPick(
        categories.map(cat => ({
          label: cat,
          picked: state.selectedCategories.includes(cat)
        })),
        {
          canPickMany: true,
          placeHolder: 'Select categories to show (empty = show all)'
        }
      );

      if (categorySelections) {
        state.selectedCategories = categorySelections.map(sel => sel.label);
        state.isActive = state.searchText.length > 0 || state.selectedCategories.length > 0;
        return state;
      }
    } else if (selectedOption.action === 'clear') {
      state.searchText = '';
      state.selectedCategories = [];
      state.isActive = false;
      return state;
    }
  }
}
