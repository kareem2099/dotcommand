/**
 * Terminal command cleaning utilities
 * Handles extracting commands from shell prompts and cleaning terminal output
 */

/**
 * Clean up terminal command line to extract the actual command
 */
export function cleanTerminalCommand(commandLine: string): string {
  console.log('Cleaning command, input:', commandLine);

  let command = commandLine.trim();
  console.log('After trim:', command);

  // Check if this contains kalyani-style prompts
  if (command.includes('┌──') && command.includes('└─$')) {
    console.log('Detected kalyani prompt, processing...');
    // Handle complex prompts like kalyani style: ┌──(kareem㉿kali)-[~] └─$
    // Remove everything before the actual command on the last line
    const lines = command.split('\n');
    const lastLine = lines[lines.length - 1].trim();

    // Check for kalyani-style prompt patterns
    const kalyaniPromptRegex = /^┌─+.*└─+\$\s*/;
    if (kalyaniPromptRegex.test(lastLine)) {
      // Try to find command after the prompt
      const commandMatch = lastLine.match(/^┌─+.*└─+\$\s*(.+)$/);
      if (commandMatch) {
        command = commandMatch[1].trim();
        console.log('After kalyani prompt removal:', command);
      }
    } else if (lastLine.includes('└─$')) {
      // Fallback for simpler kalyani prompts
      const parts = lastLine.split('└─$');
      if (parts.length > 1) {
        command = parts[1].trim();
        console.log('After simple kalyani prompt removal:', command);
      }
    }
  } else {
    console.log('No kalyani prompt detected, using general cleanup');
    // Basic cleanup for non-kalyani prompts
    command = command.replace(/^[>\$#]\s*/, '');
    console.log('After basic prompt removal:', command);

    // Some terminals might have timestamp or other prefixes
    // Only apply regex cleanup if the command seems clean already
    if (command.length > 10) {
      const match = command.match(/[^\d:]*(\w.*)/);
      if (match && match[1].trim().length > command.length - 2) {
        command = match[1].trim();
      }
    }
  }

  // Remove newlines and extra spaces
  command = command.replace(/\s+/g, ' ').trim();
  console.log('Final cleaned command:', command);

  return command;
}
