

/**
 * Command validation result levels
 */
export enum ValidationLevel {
  SAFE = 'safe',
  WARNING = 'warning',
  DANGEROUS = 'dangerous'
}

/**
 * Single validation check result
 */
export interface ValidationCheck {
  passed: boolean;
  level: ValidationLevel;
  message: string;
  details?: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  overallLevel: ValidationLevel;
  checks: ValidationCheck[];
  simulatedOutput?: string[];
  recommendations?: string[];
}

/**
 * Command validator for testing commands before saving
 */
export class CommandValidator {

  /**
   * Validate a command and return detailed results
   */
  public static async validateCommand(command: string, name?: string): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];

    // Run all validation checks
    checks.push(await this.checkSyntax(command));
    checks.push(await this.checkToolAvailability(command));
    checks.push(this.checkSafety(command));

    // If we have a name, check for duplicate names
    if (name) {
      checks.push(this.checkDuplicateName(name));
    }

    // If safe, generate simulated output
    let simulatedOutput: string[] | undefined;
    const hasDangerous = checks.some(check => check.level === ValidationLevel.DANGEROUS);
    if (!hasDangerous) {
      simulatedOutput = this.generateSimulatedOutput(command);
    }

    // Determine overall validation level
    let overallLevel = ValidationLevel.SAFE;
    if (checks.some(check => check.level === ValidationLevel.DANGEROUS)) {
      overallLevel = ValidationLevel.DANGEROUS;
    } else if (checks.some(check => check.level === ValidationLevel.WARNING)) {
      overallLevel = ValidationLevel.WARNING;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(checks, command);

    return {
      overallLevel,
      checks,
      simulatedOutput,
      recommendations
    };
  }

  // =======================
  // VALIDATION CHECKS
  // =======================

  /**
   * Check basic command syntax
   */
  private static checkSyntax(command: string): ValidationCheck {
    const cmd = command.trim();

    // Empty command
    if (!cmd) {
      return {
        passed: false,
        level: ValidationLevel.DANGEROUS,
        message: 'Command is empty',
        details: 'Cannot save or execute an empty command'
      };
    }

    // Check for obviously malformed commands
    if (cmd.includes('&&') && cmd.split('&&').some(part => !part.trim())) {
      return {
        passed: false,
        level: ValidationLevel.DANGEROUS,
        message: 'Incomplete command chain',
        details: 'Command appears to have empty parts in && chain'
      };
    }

    // Check for unclosed quotes
    const quotes = cmd.match(/['"]/g);
    if (quotes && quotes.length % 2 !== 0) {
      return {
        passed: false,
        level: ValidationLevel.WARNING,
        message: 'Unclosed quotes detected',
        details: 'Command may not execute as expected'
      };
    }

    return {
      passed: true,
      level: ValidationLevel.SAFE,
      message: 'Syntax appears valid'
    };
  }

  /**
   * Check if required tools are available
   */
  private static async checkToolAvailability(command: string): Promise<ValidationCheck> {
    // Extract the base command (first part before spaces or pipes)
    const baseCommand = command.trim().split(/\s+/)[0];

    // List of common commands that should be checked
    const commonTools = [
      'npm', 'yarn', 'git', 'docker', 'docker-compose', 'kubectl', 'python', 'python3',
      'node', 'npx', 'cargo', 'go', 'java', 'mvn', 'gradle', 'pip', 'pip3', 'terraform'
    ];

    // Skip built-in shell commands
    const shellCommands = ['ls', 'cd', 'pwd', 'echo', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'chmod', 'chown', 'grep', 'find', 'which'];
    if (shellCommands.includes(baseCommand) || baseCommand.startsWith('./') || baseCommand.includes('/')) {
      return {
        passed: true,
        level: ValidationLevel.SAFE,
        message: 'Built-in command or script'
      };
    }

    // For common tools, we could actually check if they're available
    if (commonTools.includes(baseCommand)) {
      // In a real implementation, you might check if the tool exists
      // For now, just mark as assumed available but with a note
      return {
        passed: true,
        level: ValidationLevel.SAFE,
        message: `${baseCommand} should be available`,
        details: 'Common development tool - verify installation if needed'
      };
    }

    // Unknown tool
    return {
      passed: true,
      level: ValidationLevel.WARNING,
      message: `Unknown tool: ${baseCommand}`,
      details: 'Tool availability cannot be verified - may need separate installation'
    };
  }

  /**
   * Check command safety level
   */
  private static checkSafety(command: string): ValidationCheck {
    const cmd = command.toLowerCase().trim();

    // Extremely dangerous commands
    const dangerousPatterns = [
      'rm -rf /',
      'rm -rf /*',
      'dd if=',
      '> /dev/',
      'mkfs',
      'fdisk',
      'format',
      ':(){ :|:& };:',
      'shutdown',
      'reboot',
      'halt'
    ];

    for (const pattern of dangerousPatterns) {
      if (cmd.includes(pattern)) {
        return {
          passed: false,
          level: ValidationLevel.DANGEROUS,
          message: 'Potentially destructive command',
          details: 'This command may cause system damage or data loss'
        };
      }
    }

    // Warning patterns - risky but potentially valid
    const warningPatterns = [
      'rm ',
      'del ',
      'delete',
      'uninstall',
      'reset --hard',
      'drop table',
      'drop database',
      'flush privileges',
      '--force',
      '--yes',
      '-f'
    ];

    for (const pattern of warningPatterns) {
      if (cmd.includes(pattern)) {
        return {
          passed: true,
          level: ValidationLevel.WARNING,
          message: 'Command may modify or delete data',
          details: 'Review carefully - may affect files, databases, or system state'
        };
      }
    }

    // Safe read-only commands
    const safeCommands = [
      'git status', 'git log', 'git diff', 'git show',
      'ls', 'cat', 'head', 'tail', 'grep', 'find', 'which',
      'pwd', 'echo', 'date', 'whoami', 'uname',
      'npm list', 'npm info', 'yarn info', 'pip list'
    ];

    for (const safeCmd of safeCommands) {
      if (cmd.startsWith(safeCmd)) {
        return {
          passed: true,
          level: ValidationLevel.SAFE,
          message: 'Read-only command',
          details: 'Safe to execute - only reads information'
        };
      }
    }

    // Default to warning for unknown commands
    return {
      passed: true,
      level: ValidationLevel.WARNING,
      message: 'Command safety undetermined',
      details: 'Review the command - may have side effects'
    };
  }

  /**
   * Check for duplicate command names
   */
  private static checkDuplicateName(_name: string): ValidationCheck {
    // This would need access to storage to check existing names
    // For now, just return a safe check
    // In implementation, this would query the storage

    return {
      passed: true,
      level: ValidationLevel.SAFE,
      message: 'Name validation skipped',
      details: 'Duplicate checking requires access to stored commands'
    };
  }

  /**
   * Generate simulated output for safe commands
   */
  private static generateSimulatedOutput(command: string): string[] {
    const cmd = command.toLowerCase().trim();
    const output: string[] = [];

    // Simulated outputs for common commands
    if (cmd.includes('git status')) {
      output.push('On branch main');
      output.push('Your branch is up to date with \'origin/main\'.');
      output.push('');
      output.push('Changes not staged for commit:');
      output.push('  (use "git add <file>..." to update what will be committed)');
      output.push('  modified:   src/main.js');
      output.push('');
      output.push('no changes added to commit (use "git add" and/or "git commit -a")');
    } else if (cmd.includes('npm install')) {
      output.push('npm WARN deprecated some-package@1.0.0: This package is deprecated');
      output.push('');
      output.push('added 1 package from 1 contributor in 2.345s');
      output.push('');
      output.push('+ lodash@4.17.21');
    } else if (cmd.includes('ls ')) {
      output.push('README.md');
      output.push('package.json');
      output.push('src/');
      output.push('assets/');
    } else if (cmd.includes('echo ')) {
      output.push(command.split('echo ')[1] || 'hello world');
    } else {
      // Generic success message
      output.push('$ ' + command);
      output.push('[Command executed successfully]');
    }

    return output;
  }

  /**
   * Generate recommendations based on validation results
   */
  private static generateRecommendations(checks: ValidationCheck[], command: string): string[] {
    const recommendations: string[] = [];

    const warnings = checks.filter(check => check.level === ValidationLevel.WARNING);
    const dangers = checks.filter(check => check.level === ValidationLevel.DANGEROUS);

    if (dangers.length > 0) {
      recommendations.push('⚠️ This command appears dangerous. Consider testing in a safe environment first.');
    }

    if (warnings.length > 0) {
      recommendations.push('📋 Review the command carefully before saving - it may have side effects.');
    }

    // Command-specific recommendations
    const cmd = command.toLowerCase();
    if (cmd.includes('rm ') && !cmd.includes('rm -rf')) {
      recommendations.push('💡 Consider using rm -i for interactive confirmation.');
    }

    if (cmd.includes('git') && !cmd.includes('git status')) {
      recommendations.push('🔍 Run "git status" first to see the current state.');
    }

    return recommendations;
  }
}
