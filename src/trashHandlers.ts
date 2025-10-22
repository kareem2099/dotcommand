import { commands, window } from 'vscode';
import { CommandStorage } from './storage';
import { CommandsTreeDataProvider } from './treeView';

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
async function showTrashRestoreInterface(deletedCommands: any[]): Promise<void> {
  const commandSelections = deletedCommands.map(cmd => ({
    label: `$(trash) ${cmd.name || cmd.command.substring(0, 40) + (cmd.command.length > 40 ? '...' : '')}`,
    description: `Deleted ${getTimeSinceDeletion(cmd.deletedAt)} days ago`,
    detail: cmd.command,
    command: cmd
  }));

  const selectedToRestore = await window.showQuickPick(commandSelections, {
    canPickMany: true,
    placeHolder: 'Select commands to restore from trash'
  });

  if (selectedToRestore && selectedToRestore.length > 0) {
    let restoredCount = 0;
    for (const selection of selectedToRestore) {
      const success = await storage.restoreCommand(selection.command.id);
      if (success) {
        restoredCount++;
      }
    }

    treeDataProvider.refresh();
    window.showInformationMessage(`Successfully restored ${restoredCount} command(s) from trash.`);
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
export async function handleRestoreCommandFromTrash(item: any): Promise<void> {
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
export async function handlePermanentDeleteFromTrash(item: any): Promise<void> {
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
