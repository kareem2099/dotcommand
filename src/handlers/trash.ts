import { window, TreeItem, QuickPickItem } from 'vscode';
import { CommandStorage } from '../storage/storage';
import { CommandsTreeDataProvider } from '../providers/treeView';
import { SavedCommand } from '../utils/types';

interface CommandQuickPickItem extends QuickPickItem {
  command?: SavedCommand;
}

let storage: CommandStorage;
let treeDataProvider: CommandsTreeDataProvider;

/**
 * Initialize trash handlers with required dependencies
 */
export function initializeTrashHandlers(commandStorage: CommandStorage, treeDataProviderInstance: CommandsTreeDataProvider) {
  storage = commandStorage;
  treeDataProvider = treeDataProviderInstance;
}

/**
 * Handle opening trash view
 */
export async function handleViewTrash(): Promise<void> {
  const trashStats = storage.getTrashStats();
  const deletedCommands = storage.getDeletedCommands();

  if (deletedCommands.length === 0) {
    window.showInformationMessage('Trash is empty. No deleted commands to restore.');
    return;
  }

  // Show trash information
  const trashInfo = await window.showQuickPick([
    {
      label: `🗑️ View Deleted Commands (${trashStats.count})`,
      description: `Oldest item: ${trashStats.oldestDays} days`,
      detail: 'Select to view and restore deleted commands'
    },
    {
      label: `🧹 Empty Trash (Auto - 90+ days)`,
      description: `Remove all items older than 90 days`,
      detail: 'Permanently delete expired trash'
    },
    {
      label: `🗂️ Empty All Trash (${trashStats.count} items)`,
      description: 'Remove ALL deleted commands permanently',
      detail: '⚠️ This action cannot be undone!'
    }
  ], {
    placeHolder: 'Choose trash management option'
  });

  if (trashInfo?.label.startsWith('🗑️')) {
    // Show restore interface for deleted commands
    await showTrashRestoreInterface(deletedCommands);
  } else if (trashInfo?.label.startsWith('🧹 Empty Trash (Auto')) {
    // Empty expired trash (existing functionality)
    await emptyExpiredTrash();
  } else if (trashInfo?.label.startsWith('🗂️')) {
    // Empty all trash (new manual option)
    await emptyAllTrash();
  }
}

/**
 * Show interface to restore commands from trash
 */
async function showTrashRestoreInterface(deletedCommands: SavedCommand[]): Promise<void> {
  let filteredCommands = [...deletedCommands];
  let searchQuery = '';
  const continueLoop = true;

  while (continueLoop) {
    const commandSelections = filteredCommands.map(cmd => ({
      label: `$(trash) ${cmd.name || cmd.command.substring(0, 40) + (cmd.command.length > 40 ? '...' : '')}`,
      description: `Deleted ${getTimeSinceDeletion(cmd.deletedAt!)} days ago${cmd.category ? ` [${cmd.category}]` : ''}`,
      detail: cmd.command,
      command: cmd
    }));

    // Add search/filter options at the beginning
    const searchOptions = [
      {
        label: `$(search) Search/Filter (${filteredCommands.length} commands)`,
        description: searchQuery ? `Current filter: "${searchQuery}"` : 'Type to filter commands',
        detail: 'Search by command name, content, or category'
      },
      {
        label: `$(filter) Filter by Category`,
        description: 'Show only commands from specific categories',
        detail: 'Select categories to display'
      },
      {
        label: `$(sort-desc) Sort by Deletion Date`,
        description: 'Newest deletions first',
        detail: 'Currently showing most recently deleted'
      }
    ];

    const allOptions: CommandQuickPickItem[] = [...searchOptions, ...commandSelections];

    const selectedOption = await window.showQuickPick(allOptions, {
      canPickMany: false,
      placeHolder: 'Select commands to restore or use search/filter options',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedOption) {
      return; // User cancelled
    }

    // Handle search option
    if (selectedOption.label.startsWith('$(search)')) {
      const searchInput = await window.showInputBox({
        prompt: 'Enter search terms',
        placeHolder: 'Search by command name, content, or category...',
        value: searchQuery
      });

      if (searchInput !== undefined) {
        searchQuery = searchInput.trim();
        if (searchQuery) {
          filteredCommands = deletedCommands.filter(cmd =>
            (cmd.name && cmd.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            cmd.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cmd.category && cmd.category.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        } else {
          filteredCommands = [...deletedCommands];
        }
      }
      continue; // Show the interface again with filtered results
    }

    // Handle category filter option
    if (selectedOption.label.startsWith('$(filter)')) {
      const categories = [...new Set(deletedCommands.map(cmd => cmd.category).filter(Boolean))] as string[];
      const categorySelections = await window.showQuickPick(categories.map(cat => ({
        label: cat,
        picked: filteredCommands.some(cmd => cmd.category === cat)
      })), {
        canPickMany: true,
        placeHolder: 'Select categories to show (empty = show all)'
      });

      if (categorySelections && categorySelections.length > 0) {
        const selectedCats = categorySelections.map(sel => sel.label);
        filteredCommands = deletedCommands.filter(cmd => cmd.category && selectedCats.includes(cmd.category));
      } else {
        filteredCommands = [...deletedCommands];
      }
      continue; // Show the interface again with filtered results
    }

    // Handle sort option
    if (selectedOption.label.startsWith('$(sort-desc)')) {
      filteredCommands.sort((a, b) => b.deletedAt! - a.deletedAt!);
      continue; // Show the interface again with sorted results
    }

    // Handle command selection for restoration
    if (selectedOption.command) {
      const cmd = selectedOption.command;
      const confirmRestore = await window.showQuickPick([
        {
          label: `$(arrow-right) Restore "${cmd.name || cmd.command.substring(0, 30)}..."`,
          description: 'Bring this command back to active commands',
          value: 'restore'
        },
        {
          label: `$(trash) Permanently Delete`,
          description: 'Remove this command forever',
          value: 'delete'
        },
        {
          label: `$(arrow-left) Back to List`,
          description: 'Return to command selection',
          value: 'back'
        }
      ], {
        placeHolder: 'Choose action for this command'
      });

      if (!confirmRestore) return;

      if (confirmRestore.value === 'restore') {
        const success = await storage.restoreCommand(cmd.id);
        if (success) {
          treeDataProvider.refresh();
          window.showInformationMessage(`Command restored from trash: ${cmd.name || cmd.command}`);
          // Remove from filtered list
          filteredCommands = filteredCommands.filter(c => c.id !== cmd.id);
          if (filteredCommands.length === 0) {
            window.showInformationMessage('All commands have been restored from trash.');
            return;
          }
        } else {
          window.showErrorMessage('Failed to restore command from trash.');
        }
      } else if (confirmRestore.value === 'delete') {
        const confirm = await window.showWarningMessage(
          `Permanently delete: "${cmd.name || cmd.command}"?\n\nThis action cannot be undone!`,
          { modal: true },
          'Delete Forever',
          'Cancel'
        );

        if (confirm === 'Delete Forever') {
          const commands = storage.getAllCommandsIncludingDeleted();
          const updatedCommands = commands.filter(c => c.id !== cmd.id);
          await storage['saveAllCommands'](updatedCommands);
          treeDataProvider.refresh();
          window.showInformationMessage('Command permanently deleted from trash.');
          // Remove from filtered list
          filteredCommands = filteredCommands.filter(c => c.id !== cmd.id);
          if (filteredCommands.length === 0) {
            window.showInformationMessage('Trash is now empty.');
            return;
          }
        }
      }
      // If 'back' or other action, continue the loop
      continue;
    }
  }
}

/**
 * Empty trash (remove expired items)
 */
async function emptyExpiredTrash(): Promise<void> {
  const confirm = await window.showWarningMessage(
    'Empty trash? This will permanently delete all commands deleted more than 90 days ago.',
    { modal: true },
    'Empty Trash',
    'Cancel'
  );

  if (confirm === 'Empty Trash') {
    const trashStats = storage.getTrashStats();

    await storage.emptyTrash();

    const newTrashStats = storage.getTrashStats();
    const removedCount = trashStats.count - newTrashStats.count;

    if (removedCount > 0) {
      window.showInformationMessage(`Emptied trash: ${removedCount} expired command(s) permanently deleted.`);
    } else {
      window.showInformationMessage('No expired commands found in trash.');
    }
  }
}

/**
 * Handle restoring a command from tree view context menu
 */
export async function handleRestoreCommandFromTrash(item: TreeItem): Promise<void> {
  if (!item.id) return;

  // Extract the actual command ID from prefixed ID (e.g., "trash_123" -> "123")
  let commandId = item.id;
  if (item.id.startsWith('trash_')) {
    commandId = item.id.substring(6); // Remove 'trash_' prefix
  }

  // Get the command to display its name
  const command = treeDataProvider.getCommandById(commandId) ||
                   storage.getDeletedCommands().find(cmd => cmd.id === commandId);

  if (!command) {
    window.showErrorMessage('Command not found in trash.');
    return;
  }

  const confirm = await window.showInformationMessage(
    `Restore command: "${command.name || command.command}" from trash?`,
    'Restore',
    'Cancel'
  );

  if (confirm === 'Restore') {
    const success = await storage.restoreCommand(commandId);
    if (success) {
      treeDataProvider.refresh();
      window.showInformationMessage('Command restored from trash.');
    } else {
      window.showErrorMessage('Failed to restore command from trash.');
    }
  }
}

/**
 * Get days since deletion
 */
function getTimeSinceDeletion(deletedAt: number): number {
  return Math.floor((Date.now() - deletedAt) / (24 * 60 * 60 * 1000));
}

/**
 * Empty all trash (remove all deleted items manually)
 */
async function emptyAllTrash(): Promise<void> {
  const trashStats = storage.getTrashStats();

  const confirm = await window.showWarningMessage(
    `Empty ALL trash? This will permanently delete ALL ${trashStats.count} deleted commands.\n\nThis action cannot be undone!`,
    { modal: true },
    'Empty All Trash',
    'Cancel'
  );

  if (confirm === 'Empty All Trash') {
    const allCommands = storage.getAllCommandsIncludingDeleted();
    const activeCommands = allCommands.filter(cmd => !cmd.deletedAt);

    // Save only the active commands (removes all deleted ones)
    await storage['saveAllCommands'](activeCommands);

    treeDataProvider.refresh();
    window.showInformationMessage(`Emptied all trash: ${trashStats.count} command(s) permanently deleted.`);
  }
}

/**
 * Handle permanent deletion of a command
 */
export async function handlePermanentDeleteFromTrash(item: TreeItem): Promise<void> {
  if (!item.id) return;

  const command = storage.getDeletedCommands().find(cmd => cmd.id === item.id);

  if (!command) {
    window.showErrorMessage('Command not found in trash.');
    return;
  }

  const confirm = await window.showWarningMessage(
    `Permanently delete command: "${command.name || command.command}"?\n\nThis action cannot be undone!`,
    { modal: true },
    'Delete Forever',
    'Cancel'
  );

  if (confirm === 'Delete Forever') {
    const commands = storage.getAllCommandsIncludingDeleted();
    const updatedCommands = commands.filter(cmd => cmd.id !== item.id);

    // Save the filtered commands (this removes it permanently)
    await storage['saveAllCommands'](updatedCommands);

    treeDataProvider.refresh();
    window.showInformationMessage('Command permanently deleted from trash.');
  }
}
