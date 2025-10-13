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
      label: `🧹 Empty Trash (${trashStats.count} items)`,
      description: `Remove all items older than 90 days`,
      detail: 'Permanently delete expired trash'
    }
  ], {
    placeHolder: 'Choose trash management option'
  });

  if (trashInfo?.label.startsWith('🗑️')) {
    // Show restore interface for deleted commands
    await showTrashRestoreInterface(deletedCommands);
  } else if (trashInfo?.label.startsWith('🧹')) {
    // Empty expired trash
    await emptyExpiredTrash();
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
  // This would be called from context menu on trash items
  const confirm = await window.showInformationMessage(
    'Restore this command from trash?',
    'Restore',
    'Cancel'
  );

  if (confirm === 'Restore') {
    const success = await storage.restoreCommand(item.id);
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
