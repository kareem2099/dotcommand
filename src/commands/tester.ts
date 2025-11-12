import { ValidationLevel, ValidationResult } from './validator';

interface CommandParameter {
  name: string;
  defaultValue: string;
}

/**
 * Command tester for handling parameter resolution and execution testing
 */
export class CommandTester {

  /**
   * Preview parameter resolution for commands with variables
   */
  public static resolveParameters(command: string, parameters?: CommandParameter[]): { resolvedCommand: string; parameterValues: Record<string, string> } {
    if (!parameters || parameters.length === 0) {
      return { resolvedCommand: command, parameterValues: {} };
    }

    let resolvedCommand = command;
    const parameterValues: Record<string, string> = {};

    // Handle VS Code input variables (${input:variableName})
    parameters.forEach(param => {
      if (param.name && param.defaultValue) {
        // Replace in command
        const inputPattern = new RegExp(`\\$\\{input:${param.name}\\}`, 'g');
        resolvedCommand = resolvedCommand.replace(inputPattern, param.defaultValue);

        // Store parameter value
        parameterValues[param.name] = param.defaultValue;
      }
    });

    return { resolvedCommand, parameterValues };
  }

  /**
   * Test command execution in a controlled environment (future enhancement)
   */
  public static async testExecuteCommand(command: string, _timeoutMs: number = 10000): Promise<{ success: boolean; output: string[]; error?: string }> {
    // For now, return simulated result
    // In future, could create disposable terminals or use system calls
    return {
      success: false,
      output: ['⚠️ Real command execution not yet implemented'],
      error: 'This feature is planned for future development'
    };
  }

  /**
   * Get safety recommendations based on validation result
   */
  public static getSafetyRecommendations(result: ValidationResult): string[] {
    const recommendations: string[] = [];

    if (result.overallLevel === ValidationLevel.DANGEROUS) {
      recommendations.push('🛑 This command is potentially destructive and should not be executed');
      recommendations.push('🧪 Use "Test Command" feature to validate before saving');
    }

    if (result.overallLevel === ValidationLevel.WARNING) {
      recommendations.push('⚠️ Review this command carefully - it may have side effects');
      recommendations.push('🔍 Consider using "Test Command" to understand the impact');
    }

    if (result.checks.some(check => !check.passed)) {
      recommendations.push('❌ Fix validation errors before proceeding');
    }

    return recommendations;
  }
}
