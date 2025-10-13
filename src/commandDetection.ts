/**
 * Command category detection utilities
 * Handles automatic categorization of commands based on patterns and keywords
 */

/**
 * Auto-detect category based on command keywords
 */
export function detectCommandCategory(command: string): string | undefined {
  // Git commands
  if (command.match(/\bgit\b/)) {
    if (command.includes('clone')) return 'git-clone';
    if (command.includes('commit')) return 'git-commit';
    if (command.includes('push') || command.includes('pull')) return 'git-sync';
    if (command.includes('branch')) return 'git-branch';
    if (command.includes('merge')) return 'git-merge';
    if (command.includes('checkout')) return 'git-checkout';
    if (command.includes('add') || command.includes('status') || command.includes('diff')) return 'git-workspace';
    return 'git';
  }

  // Node.js/NPM/Yarn/PNPM commands
  if (command.match(/\b(npm|yarn|pnpm)\b/)) {
    if (command.includes('install')) return 'npm-install';
    if (command.includes('run') || command.includes('start') || command.includes('build') || command.includes('dev')) return 'npm-scripts';
    if (command.includes('test')) return 'npm-test';
    if (command.includes('update') || command.includes('outdated')) return 'npm-update';
    return 'npm';
  }

  // Docker commands
  if (command.match(/\bdocker\b/)) {
    if (command.includes('build')) return 'docker-build';
    if (command.includes('run')) return 'docker-run';
    if (command.includes('compose')) return 'docker-compose';
    if (command.includes('ps') || command.includes('logs')) return 'docker-manage';
    return 'docker';
  }

  // Kubernetes commands
  if (command.match(/\b(kubectl|helm)\b/)) {
    if (command.includes('apply') || command.includes('create')) return 'k8s-deploy';
    if (command.includes('get') || command.includes('describe')) return 'k8s-inspect';
    if (command.includes('logs')) return 'k8s-logs';
    return 'kubernetes';
  }

  // AWS CLI commands
  if (command.match(/\b(aws|terraform)\b/)) {
    return 'cloud-aws';
  }

  // Database commands
  if (command.match(/\b(psql|mysql|mongo)/)) {
    return 'database';
  }

  // Build tools
  if (command.match(/\b(webpack|parcel|vite|gulp|grunt)\b/)) {
    return 'build-tools';
  }

  // Testing frameworks
  if (command.match(/\b(jest|mocha|cypress|vitest|playwright)\b/)) {
    return 'testing';
  }

  // Python commands
  if (command.match(/\b(python|pip|poetry|conda)\b/)) {
    return 'python';
  }

  // Rust commands
  if (command.match(/\b(cargo|rust)\b/)) {
    return 'rust';
  }

  // Go commands
  if (command.match(/\b(go mod|go build|go run)\b/)) {
    return 'go';
  }

  // System tools
  if (command.match(/\b(make|cmake|apt|yum|brew)\b/)) {
    return 'system';
  }

  // Deployment/CD commands
  if (command.match(/\b(rsync|scp|ssh|ansible|deploy)/)) {
    return 'deployment';
  }

  return undefined; // No category detected
}
