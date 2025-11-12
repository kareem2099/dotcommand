/**
 * Terminal command cleaning utilities
 * Handles extracting commands from shell prompts and cleaning terminal output
 */

import * as vscode from 'vscode';

// Cache shell type to avoid repeated detection
let cachedShellType: string | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Learning system for user corrections
interface UserCorrection {
  original: string;
  corrected: string;
  shellType: string;
  timestamp: number;
}

const userCorrections: UserCorrection[] = [];
const MAX_CORRECTIONS = 100; // Keep last 100 corrections

// Analytics for cleaning performance
interface CleaningAnalytics {
  totalCommands: number;
  successfulCleanings: number;
  failedCleanings: number;
  recoveryUsed: number;
  correctionsApplied: number;
  shellTypeStats: Record<string, number>;
  lastReset: number;
}

let analytics: CleaningAnalytics = {
  totalCommands: 0,
  successfulCleanings: 0,
  failedCleanings: 0,
  recoveryUsed: 0,
  correctionsApplied: 0,
  shellTypeStats: {},
  lastReset: Date.now()
};

// Pre-compiled regex patterns for better performance
const SHELL_PATTERNS: Record<string, RegExp> = {
  powershell: /^.*(PS\s+.*?>\s*)/,
  cmd: /^.*(>\s*)/,
  zsh: /^.*%\s+/,
  bash: /^.*\$\s+/,
  fish: /^.*(>\s*)/,
  kalyani: /^.*\s*└─+\$\s*/,
  fallback: /^.*[#$%>]+\s*/
};

/**
 * Attempts to get shell type from VS Code's shell integration API (VS Code 1.74+)
 */
function getShellFromIntegration(): string | null {
  const terminal = vscode.window.activeTerminal;
  if (!terminal) return null;

  // Check if shell integration is available (VS Code 1.74+)
  if ('shellIntegration' in terminal) {
    try {
      // Type assertion for shell integration (available in VS Code 1.74+)
      const shellIntegration = (terminal as { shellIntegration?: { shell?: string } }).shellIntegration;
      if (shellIntegration?.shell) {
        const shell = shellIntegration.shell.toLowerCase();
        console.log('Detected shell via integration API:', shell);

        if (shell.includes('pwsh') || shell.includes('powershell')) {
          return 'powershell';
        }
        if (shell.includes('cmd')) {
          return 'cmd';
        }
        if (shell.includes('zsh')) {
          return 'zsh';
        }
        if (shell.includes('bash')) {
          return 'bash';
        }
        if (shell.includes('fish')) {
          return 'fish';
        }
      }
    } catch (error) {
      console.warn('Shell integration API not available or failed:', error);
    }
  }

  return null;
}

/**
 * Determines the active shell type based on the terminal's shell path
 * Uses caching for performance since shell type doesn't change often
 */
export function getActiveShellType(): string {
  const now = Date.now();

  // Return cached result if still valid
  if (cachedShellType && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedShellType;
  }

  // First, try VS Code's shell integration API (more reliable)
  const integrationShell = getShellFromIntegration();
  if (integrationShell) {
    cachedShellType = integrationShell;
    cacheTimestamp = now;
    return cachedShellType;
  }

  // Fallback to terminal creation options
  const terminal = vscode.window.activeTerminal;
  if (!terminal) {
    cachedShellType = 'unknown';
    cacheTimestamp = now;
    return cachedShellType;
  }

  // Cast to access shellPath property which exists in TerminalOptions
  const creationOptions = terminal.creationOptions as vscode.TerminalOptions & { shellPath?: string };
  const shellPath = creationOptions.shellPath;

  if (!shellPath) {
    cachedShellType = 'unknown';
    cacheTimestamp = now;
    return cachedShellType;
  }

  const lowerPath = shellPath.toLowerCase();

  if (lowerPath.includes('pwsh') || lowerPath.includes('powershell')) {
    cachedShellType = 'powershell';
  } else if (lowerPath.includes('cmd.exe')) {
    cachedShellType = 'cmd';
  } else if (lowerPath.includes('zsh')) {
    cachedShellType = 'zsh';
  } else if (lowerPath.includes('bash')) {
    cachedShellType = 'bash';
  } else if (lowerPath.includes('fish')) {
    cachedShellType = 'fish';
  } else {
    cachedShellType = 'unknown';
  }

  cacheTimestamp = now;
  return cachedShellType;
}

/**
 * Handles multi-line commands by combining continued lines
 */
function handleMultiLineCommands(commandLine: string): string {
  const lines = commandLine.split('\n');

  // Check if command spans multiple lines (backslash continuation)
  for (let i = lines.length - 2; i >= 0; i--) {
    if (lines[i].trim().endsWith('\\')) {
      // Combine continued lines
      lines[i] = lines[i].slice(0, -1) + ' ' + lines[i + 1];
      lines.splice(i + 1, 1);
    }
  }

  // Return the last line (which may now be combined)
  return lines[lines.length - 1];
}

/**
 * Tracks cleaning analytics
 */
function trackCleaningAnalytics(success: boolean, shellType: string, usedRecovery: boolean = false, usedCorrection: boolean = false): void {
  analytics.totalCommands++;

  if (success) {
    analytics.successfulCleanings++;
  } else {
    analytics.failedCleanings++;
  }

  if (usedRecovery) {
    analytics.recoveryUsed++;
  }

  if (usedCorrection) {
    analytics.correctionsApplied++;
  }

  // Track shell type usage
  analytics.shellTypeStats[shellType] = (analytics.shellTypeStats[shellType] || 0) + 1;
}

/**
 * Gets current analytics data
 */
export function getCleaningAnalytics(): CleaningAnalytics {
  return { ...analytics };
}

/**
 * Test result interface
 */
interface TestResult {
  description: string;
  input: string;
  shell: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  error?: string;
}

/**
 * Resets analytics data
 */
export function resetCleaningAnalytics(): void {
  analytics = {
    totalCommands: 0,
    successfulCleanings: 0,
    failedCleanings: 0,
    recoveryUsed: 0,
    correctionsApplied: 0,
    shellTypeStats: {},
    lastReset: Date.now()
  };
}

/**
 * Runs integration tests for the command cleaning system
 */
export function runCleaningTests(): { passed: number; failed: number; results: TestResult[] } {
  console.log('Running DotCommand cleaning integration tests...');

  const testCases = [
    // Basic shell prompts
    { input: 'user@host:~$ ls -la', shell: 'bash', expected: 'ls -la', description: 'Basic bash prompt' },
    { input: 'user@mac % git status', shell: 'zsh', expected: 'git status', description: 'Basic zsh prompt' },
    { input: 'PS C:\\Users\\user> dir', shell: 'powershell', expected: 'dir', description: 'Basic PowerShell prompt' },
    { input: 'C:\\>cd temp', shell: 'cmd', expected: 'cd temp', description: 'Basic CMD prompt' },

    // Complex prompts
    { input: '┌──(user㉿kali)-[~] └─$ npm install', shell: 'bash', expected: 'npm install', description: 'Kali Linux prompt' },
    { input: 'user@host:/very/long/path/that/goes/on$ docker ps', shell: 'bash', expected: 'docker ps', description: 'Long path bash prompt' },
    { input: 'PS C:\\Program Files\\PowerShell> Get-Process', shell: 'powershell', expected: 'Get-Process', description: 'PowerShell with path' },

    // Multi-line commands
    { input: 'user@host:~$ npm install \\\n  lodash \\\n  express', shell: 'bash', expected: 'npm install lodash express', description: 'Multi-line npm install' },

    // Edge cases
    { input: '>>> python3', shell: 'unknown', expected: 'python3', description: 'Fallback pattern' },
    { input: '$ ls', shell: 'bash', expected: 'ls', description: 'Simple dollar prompt' },
    { input: '% pwd', shell: 'zsh', expected: 'pwd', description: 'Simple percent prompt' },

    // Custom prompts (should use fallback)
    { input: '🚀 custom> git commit', shell: 'unknown', expected: 'git commit', description: 'Custom emoji prompt' },
  ];

  let passed = 0;
  let failed = 0;
  const results: TestResult[] = [];

  for (const test of testCases) {
    try {
      const result = cleanTerminalCommand(test.input, test.shell);
      const success = result === test.expected;

      if (success) {
        passed++;
        console.log(`✅ PASS: ${test.description}`);
      } else {
        failed++;
        console.log(`❌ FAIL: ${test.description}`);
        console.log(`   Input: "${test.input}"`);
        console.log(`   Expected: "${test.expected}"`);
        console.log(`   Got: "${result}"`);
      }

      results.push({
        description: test.description,
        input: test.input,
        shell: test.shell,
        expected: test.expected,
        actual: result,
        passed: success
      });

    } catch (error) {
      failed++;
      console.log(`💥 ERROR: ${test.description} - ${error}`);
      results.push({
        description: test.description,
        input: test.input,
        shell: test.shell,
        expected: test.expected,
        actual: null,
        error: error instanceof Error ? error.message : String(error),
        passed: false
      });
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

  // Show analytics after tests
  const analytics = getCleaningAnalytics();
  console.log('Analytics after tests:', analytics);

  return { passed, failed, results };
}

/**
 * Stores a user correction for future learning
 */
export function learnFromCorrection(original: string, corrected: string, shellType: string): void {
  userCorrections.push({
    original: original.trim(),
    corrected: corrected.trim(),
    shellType,
    timestamp: Date.now()
  });

  // Keep only the most recent corrections
  if (userCorrections.length > MAX_CORRECTIONS) {
    userCorrections.shift(); // Remove oldest
  }

  console.log(`DotCommand: Learned correction for ${shellType}: "${original}" → "${corrected}"`);
}

/**
 * Opens VS Code settings for prompt regex configuration
 */
export async function configurePromptRegex(): Promise<void> {
  const shellType = getActiveShellType();
  const currentPattern = vscode.workspace.getConfiguration('dotcommand')
    .get<string>(`promptRegex.${shellType}`);

  const examples = {
    zsh: '^.*%\\s+',
    bash: '^.*\\$\\s+',
    powershell: '^.*(PS\\s+.*?>\\s*)',
    cmd: '^.*(>)',
    fish: '^.*(>\\s*)'
  };

  const example = examples[shellType as keyof typeof examples] || examples.bash;

  const newPattern = await vscode.window.showInputBox({
    prompt: `Configure custom regex for ${shellType} prompt removal`,
    placeHolder: `Example: ${example}`,
    value: currentPattern || example,
    validateInput: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Pattern cannot be empty';
      }
      try {
        new RegExp(value);
        return null;
      } catch {
        return 'Invalid regex pattern';
      }
    }
  });

  if (newPattern && newPattern.trim()) {
    try {
      // Validate the regex before saving
      new RegExp(newPattern);

      await vscode.workspace.getConfiguration('dotcommand')
        .update(`promptRegex.${shellType}`, newPattern.trim(), vscode.ConfigurationTarget.Global);

      vscode.window.showInformationMessage(
        `Custom prompt regex saved for ${shellType}. Test it with a command from the terminal.`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Attempts to apply learned corrections to improve cleaning
 */
function applyLearnedCorrections(commandLine: string, shellType: string): string | null {
  // Look for exact matches in recent corrections
  const relevantCorrections = userCorrections
    .filter(correction => correction.shellType === shellType)
    .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

  for (const correction of relevantCorrections) {
    if (commandLine.includes(correction.original)) {
      const improved = commandLine.replace(correction.original, correction.corrected);
      console.log('Applied learned correction:', correction.original, '→', correction.corrected);
      return improved;
    }
  }

  return null; // No applicable correction found
}

/**
 * Enhanced error recovery with multiple fallback strategies
 */
function attemptRecoveryStrategies(commandLine: string, _shellType: string): string | null {
  console.log('Attempting enhanced recovery strategies for:', commandLine);

  // Strategy 1: Try all shell patterns regardless of detected shell
  const allPatterns = [
    SHELL_PATTERNS.powershell,
    SHELL_PATTERNS.cmd,
    SHELL_PATTERNS.zsh,
    SHELL_PATTERNS.bash,
    SHELL_PATTERNS.fish,
    SHELL_PATTERNS.kalyani,
    SHELL_PATTERNS.fallback
  ];

  for (const pattern of allPatterns) {
    const result = commandLine.replace(pattern, '').trim();
    if (validateCleanedCommand(result)) {
      console.log('Recovery strategy 1 successful with pattern:', pattern.source);
      return result;
    }
  }

  // Strategy 2: Remove everything before last common command starter
  const commonStarters = [
    'npm', 'yarn', 'pnpm', 'git', 'docker', 'docker-compose',
    'python', 'python3', 'pip', 'pip3', 'node', 'npx',
    'ls', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep',
    'curl', 'wget', 'ssh', 'scp', 'rsync'
  ];

  for (const starter of commonStarters) {
    const index = commandLine.lastIndexOf(starter);
    if (index > 0) {
      const extractedCommand = commandLine.substring(index).trim();
      if (validateCleanedCommand(extractedCommand)) {
        console.log('Recovery strategy 2 successful with starter:', starter);
        return extractedCommand;
      }
    }
  }

  // Strategy 3: Intelligent prompt detection using common prompt patterns
  const promptPatterns = [
    /\b[A-Za-z0-9_]+@[A-Za-z0-9_.-]+:[^$]*\$ /,  // user@host:~/path$
    /\b[A-Za-z0-9_]+@[A-Za-z0-9_.-]+:[^$]*% /,  // user@host:~/path%
    /PS [A-Za-z]:[^>]*> /,                        // PS C:\path>
    /[A-Za-z]:[^>]*> /,                          // C:\path>
    /> /,                                         // >
    /└─+\$ /,                                     // └─$
  ];

  for (const pattern of promptPatterns) {
    const result = commandLine.replace(pattern, '').trim();
    if (validateCleanedCommand(result) && result !== commandLine.trim()) {
      console.log('Recovery strategy 3 successful with prompt pattern');
      return result;
    }
  }

  // Strategy 4: Remove all non-alphanumeric characters from start until first letter/digit
  const alphaStartMatch = commandLine.match(/[a-zA-Z0-9]/);
  if (alphaStartMatch && alphaStartMatch.index && alphaStartMatch.index > 0) {
    const result = commandLine.substring(alphaStartMatch.index).trim();
    if (validateCleanedCommand(result)) {
      console.log('Recovery strategy 4 successful: alpha start extraction');
      return result;
    }
  }

  console.log('All recovery strategies failed');
  return null;
}

/**
 * Validates if a cleaned command looks reasonable
 */
function validateCleanedCommand(command: string): boolean {
  // Basic validation: not empty, no prompt chars, reasonable length
  return command.length > 0 &&
         command.length < 1000 &&
         !/[#$%>]$/.test(command.trim()) &&
         !/^\s*[#$%>]/.test(command); // No leading prompt chars
}

/**
 * Clean up terminal command line to extract the actual command
 * Now supports multiple shell types with default regex patterns and user customization
 */
export function cleanTerminalCommand(commandLine: string, shellType: string = 'unknown'): string {
  console.log('Cleaning command, input:', commandLine, 'Shell type:', shellType);

  let command = commandLine.trim();
  console.log('After trim:', command);

  // Try to apply learned corrections first
  const learnedCorrection = applyLearnedCorrections(command, shellType);
  if (learnedCorrection) {
    console.log('Using learned correction:', learnedCorrection);
    command = learnedCorrection;
  }

  // Handle multi-line commands first (backslash continuation)
  const processedLine = handleMultiLineCommands(command);
  console.log('After multi-line processing:', processedLine);

  // Get the last line, as it typically contains the command
  const lines = processedLine.split('\n');
  const lastLine = lines[lines.length - 1].trim();
  console.log('Last line:', lastLine);

  // First, check for user-defined custom regex in settings
  const config = vscode.workspace.getConfiguration('dotcommand');
  const customRegexPattern = config.get<string>(`promptRegex.${shellType}`);

  if (customRegexPattern) {
    try {
      const customRegex = new RegExp(customRegexPattern);
      const cleaned = lastLine.replace(customRegex, '').trim();
      console.log('After custom regex removal:', cleaned);
      return cleaned;
    } catch (e) {
      console.error('DotCommand: Invalid custom regex in settings', e);
      // Continue with default patterns
    }
  }

  // Apply default regex patterns based on shell type
  switch (shellType) {
    case 'zsh':
    case 'bash': {
      // Special handling for kalyani-style prompts (Kali Linux)
      if (command.includes('┌──') && lastLine.includes('└─$')) {
        console.log('Detected kalyani prompt, processing...');
        command = lastLine.replace(SHELL_PATTERNS.kalyani, '').trim();
        console.log('After kalyani prompt removal:', command);
      } else {
        // Default zsh/bash prompt removal
        if (shellType === 'zsh') {
          command = lastLine.replace(SHELL_PATTERNS.zsh, '').trim();
          console.log('After zsh prompt removal:', command);
        } else {
          command = lastLine.replace(SHELL_PATTERNS.bash, '').trim();
          console.log('After bash prompt removal:', command);
        }
      }
      break;
    }

    case 'powershell': {
      // PowerShell: PS C:\...\> command
      command = lastLine.replace(SHELL_PATTERNS.powershell, '').trim();
      console.log('After PowerShell prompt removal:', command);
      break;
    }

    case 'cmd': {
      // CMD: C:\...> command
      command = lastLine.replace(SHELL_PATTERNS.cmd, '').trim();
      console.log('After CMD prompt removal:', command);
      break;
    }

    case 'fish': {
      // Fish: user@host ~> command
      command = lastLine.replace(SHELL_PATTERNS.fish, '').trim();
      console.log('After Fish prompt removal:', command);
      break;
    }

    default: {
      // Fallback: try to remove common prompt characters
      command = lastLine.replace(SHELL_PATTERNS.fallback, '').trim();
      console.log('After fallback prompt removal:', command);
      break;
    }
  }

  // Remove newlines and extra spaces
  command = command.replace(/\s+/g, ' ').trim();
  console.log('Final cleaned command:', command);

  // Validate the cleaned command
  if (!validateCleanedCommand(command)) {
    console.warn('DotCommand: Cleaned command failed validation, attempting enhanced error recovery');

    // Enhanced error recovery with multiple strategies
    const recoveredCommand = attemptRecoveryStrategies(lastLine, shellType);
    if (recoveredCommand && validateCleanedCommand(recoveredCommand)) {
      console.log('Enhanced recovery successful:', recoveredCommand);
      trackCleaningAnalytics(true, shellType, true, learnedCorrection !== null);
      return recoveredCommand;
    }

    console.error('DotCommand: All cleaning and recovery strategies failed for command:', commandLine);
    trackCleaningAnalytics(false, shellType, true, learnedCorrection !== null);
    return command; // Return best effort even if failed
  }

  // Track successful cleaning
  trackCleaningAnalytics(true, shellType, false, learnedCorrection !== null);
  return command;
}
