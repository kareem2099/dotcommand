import { commands, window } from 'vscode';

/**
 * Handle the view commands action
 */
export async function handleViewCommands(): Promise<void> {
  // Reveal the tree view in the sidebar
  commands.executeCommand('dotcommand.commandsView.focus');
}
