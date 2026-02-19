import { window, ExtensionContext } from 'vscode';
import { getTerminalManager } from '../utils/terminalManager';
import { getCommandHistoryManager } from '../utils/commandHistory';
import commandData from '../data/preparedCommands.json';

// ─── Public interfaces (unchanged – callers depend on these) ─────────────────

/**
 * Definition for a parameter that needs user input
 */
export interface CommandParameter {
  name: string;
  description: string;
  defaultValue?: string;
  validation?: (value: string) => boolean;
  validationMessage?: string;
}

/**
 * Definition for a prepared command with dynamic parameters
 */
export interface PreparedCommand {
  name: string;
  command: string;
  description: string;
  category: string;
  parameters: CommandParameter[];
}

// ─── Named-validator registry ────────────────────────────────────────────────
// JSON parameters reference validators by name string so the data file stays
// free of code.  Add new validators here without touching the JSON.

type ValidatorFn = (value: string) => boolean;

const VALIDATORS: Record<string, ValidatorFn> = {
  'semver':       (v) => /^\d+\.\d+\.\d+$/.test(v),
  'port':         (v) => /^\d+$/.test(v) && parseInt(v) > 0 && parseInt(v) <= 65535,
  'positive-int': (v) => /^\d+$/.test(v) && parseInt(v) >= 0,
  'vsix':         (v) => v.endsWith('.vsix'),
  'python-file':  (v) => v.endsWith('.py'),
  'file-ext':     (v) => /\.[a-zA-Z0-9]+$/.test(v),
  'wildcard':     (v) => v.includes('*') || v.includes('?'),
  'docker-name':  (v) => /^[a-zA-Z0-9\-_.]+$/.test(v),
};

// ─── JSON → PreparedCommand transformer ──────────────────────────────────────

interface RawParameter {
  name: string;
  description: string;
  default?: string;
  validate?: string;
  validationMessage?: string;
}

interface RawCommand {
  name: string;
  command: string;
  description: string;
  parameters?: RawParameter[];
}

interface RawCategory {
  name: string;
  commands: RawCommand[];
}

function buildCommands(): PreparedCommand[] {
  const result: PreparedCommand[] = [];

  for (const cat of (commandData as { categories: RawCategory[] }).categories) {
    for (const raw of cat.commands) {
      const params: CommandParameter[] = (raw.parameters ?? []).map(p => {
        const param: CommandParameter = {
          name: p.name,
          description: p.description,
          defaultValue: p.default,
        };
        if (p.validate && VALIDATORS[p.validate]) {
          param.validation = VALIDATORS[p.validate];
          param.validationMessage = p.validationMessage;
        }
        return param;
      });

      result.push({
        name: raw.name,
        command: raw.command,
        description: raw.description,
        category: cat.name,
        parameters: params,
      });
    }
  }

  return result;
}

// ─── Exported command registry ────────────────────────────────────────────────

export const PREPARED_COMMANDS: PreparedCommand[] = buildCommands();

// ─── Public helpers ───────────────────────────────────────────────────────────

export function getPreparedCommandsForCategory(categoryLabel: string): PreparedCommand[] {
  return PREPARED_COMMANDS.filter(cmd => cmd.category === categoryLabel);
}

export function getPreparedCommandCategories(): string[] {
  const seen = new Set<string>();
  return PREPARED_COMMANDS
    .map(cmd => cmd.category)
    .filter(cat => { if (seen.has(cat)) return false; seen.add(cat); return true; });
}

// ─── Command execution ────────────────────────────────────────────────────────

export async function handlePreparedCommand(commandTemplate: string, context?: ExtensionContext): Promise<void> {
  const preparedCommand = PREPARED_COMMANDS.find(cmd => cmd.command === commandTemplate);

  if (!preparedCommand) {
    window.showErrorMessage(`Prepared command template not found: ${commandTemplate}`);
    return;
  }

  try {
    const parameterValues: Record<string, string> = {};

    for (const param of preparedCommand.parameters) {
      let value: string | undefined;
      let attempt = 0;
      const maxAttempts = 3;

      do {
        attempt++;
        value = await window.showInputBox({
          prompt: `${param.description}${param.defaultValue ? ` (${param.defaultValue})` : ''}`,
          placeHolder: param.defaultValue || param.name,
          value: param.defaultValue,
          validateInput: param.validation
            ? (v) => param.validation!(v) ? null : (param.validationMessage || 'Invalid input')
            : undefined
        });

        if (value === undefined && attempt === 1) return; // cancelled
        if (value === '' && param.defaultValue) value = param.defaultValue;
      } while (!value && attempt < maxAttempts);

      if (!value) return;
      parameterValues[param.name] = value;
    }

    // Replace all {placeholder} tokens
    let finalCommand = commandTemplate;
    for (const [key, val] of Object.entries(parameterValues)) {
      finalCommand = finalCommand.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }

    // Confirm before execution
    const confirm = await window.showWarningMessage(
      `Execute: "${finalCommand}"?`,
      { modal: true },
      'Yes, Run',
      'Cancel'
    );

    if (confirm === 'Yes, Run') {
      // Get terminal for this command using TerminalManager
      const terminalManager = getTerminalManager();
      const terminal = terminalManager.getOrCreateTerminal(finalCommand, context);

      // Track command execution
      const terminalName = terminal.name;
      terminalManager.trackCommand(terminalName, finalCommand);

      // Track in global command history
      const historyManager = getCommandHistoryManager();
      await historyManager.trackCommand(finalCommand, 'prepared', terminalName, preparedCommand.category);

      // Show the terminal and wait for it to be ready
      terminal.show();

      // Wait for terminal to be ready, then send command
      setTimeout(() => {
        terminal.sendText(finalCommand);
        window.showInformationMessage(`Executed: ${finalCommand}`);
      }, 500); // Wait 500ms for terminal to fully open
    }

  } catch (error) {
    window.showErrorMessage(`Error running prepared command: ${error}`);
  }
}

/**
 * Create command template registry map for quick lookups
 */
export function createCommandTemplateMap(commands: PreparedCommand[]): Map<string, PreparedCommand> {
  return new Map(commands.map(cmd => [cmd.name, cmd]));
}
