/**
 * Command category detection utilities
 * Handles automatic categorization of commands based on patterns and keywords
 */

/**
 * Auto-detect category based on command keywords
 */
export function detectCommandCategory(command: string): string | undefined {
  // Git commands - task-based categorization
  if (command.match(/\bgit\b/)) {
    if (command.includes('clone')) return 'git-clone';
    if (command.includes('init')) return 'git-init';
    if (command.includes('add')) return 'git-add';
    if (command.includes('status')) return 'git-status';
    if (command.includes('diff')) return 'git-diff';
    if (command.includes('commit')) return 'git-commit';
    if (command.includes('push')) return 'git-push';
    if (command.includes('pull')) return 'git-pull';
    if (command.includes('fetch')) return 'git-fetch';
    if (command.includes('merge')) return 'git-merge';
    if (command.includes('rebase')) return 'git-rebase';
    if (command.includes('checkout') || command.includes('switch')) return 'git-checkout';
    if (command.includes('branch')) return 'git-branch';
    if (command.includes('tag')) return 'git-tag';
    if (command.includes('log') || command.includes('reflog')) return 'git-log';
    if (command.includes('reset') || command.includes('revert')) return 'git-reset';
    if (command.includes('stash')) return 'git-stash';
    if (command.includes('remote')) return 'git-remote';
    if (command.includes('config')) return 'git-config';
    return 'git';
  }

  // Node.js/NPM/Yarn/PNPM commands - task-based categorization
  if (command.match(/\b(npm|yarn|pnpm)\b/)) {
    if (command.includes('install') || command.includes('add') || command.includes('remove')) return 'npm-install';
    if (command.includes('run ')) return 'npm-scripts';
    if (command.includes('test') || command.includes('jest') || command.includes('mocha')) return 'npm-test';
    if (command.includes('start') || command.includes('dev') || command.includes('serve') || command.includes('preview')) return 'npm-scripts';
    if (command.includes('build') || command.includes('compile')) return 'npm-scripts';
    if (command.includes('lint')) return 'npm-lint';
    if (command.includes('update') || command.includes('upgrade') || command.includes('outdated')) return 'npm-update';
    if (command.includes('audit') || command.includes('security')) return 'npm-security';
    if (command.includes('publish')) return 'npm-publish';
    if (command.includes('init')) return 'npm-init';
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

  // Linux system commands
  if (command.match(/\b(cd|ls|pwd|mkdir|rmdir|touch|cp|mv|rm|ln|chmod|chown|chgrp|find|grep|sed|awk|sort|uniq|wc|cat|more|less|head|tail|nano|vim|vi|nano|ssh|scp|rsync|tar|gzip|bzip2|xz|zip|mount|umount|df|du|ps|kill|top|htop|ps|netstat|ss|ping|curl|wget|hostname|uname|free|uptime|whoami|id|groups|useradd|usermod|userdel|groupadd|sudo|su)\b/)) {
    if (command.match(/\b(cd|pwd)\b/)) return 'linux-navigation';
    if (command.match(/\b(ls|dir)\b/)) return 'linux-list';
    if (command.match(/\b(mkdir|rmdir)\b/)) return 'linux-directories';
    if (command.match(/\b(cp|mv|rm|ln)\b/)) return 'linux-files';
    if (command.match(/\b(chmod|chown|chgrp)\b/)) return 'linux-permissions';
    if (command.match(/\b(find|grep|sed|awk|sort|uniq|wc)\b/)) return 'linux-search';
    if (command.match(/\b(cat|more|less|head|tail)\b/)) return 'linux-view';
    if (command.match(/\b(nano|vim|vi|emacs)\b/)) return 'linux-editors';
    if (command.match(/\b(ssh|scp|rsync)\b/)) return 'linux-network';
    if (command.match(/\b(tar|gzip|bzip2|xz|zip)\b/)) return 'linux-compression';
    if (command.match(/\b(mount|umount|df|du)\b/)) return 'linux-storage';
    if (command.match(/\b(ps|kill|top|htop)\b/)) return 'linux-processes';
    if (command.match(/\b(netstat|ss|ping|curl|wget)\b/)) return 'linux-network';
    if (command.match(/\b(hostname|uname|free|uptime|whoami|id|groups)\b/)) return 'linux-system-info';
    if (command.match(/\b(useradd|usermod|userdel|groupadd|sudo|su)\b/)) return 'linux-user-mgmt';
    if (command.match(/\b(make|cmake|apt|yum|brew)\b/)) return 'linux-system-tools';
    if (command.match(/\b(git)\b/)) return 'linux-git';
    return 'linux-system';
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
