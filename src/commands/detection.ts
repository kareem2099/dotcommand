/**
 * Command category detection utilities
 * Handles automatic categorization of commands based on patterns and keywords
 */

/**
 * Auto-detect category based on command keywords
 * Uses unified categories for better organization
 */
export function detectCommandCategory(command: string): string | undefined {
  // Git commands - all git commands in one category
  if (command.match(/\bgit\b/)) {
    return 'git';
  }

  // Node.js/NPM/Yarn/PNPM commands - all package managers in one category
  if (command.match(/\b(npm|yarn|pnpm)\b/)) {
    return 'npm';
  }

  // Docker commands - all docker commands in one category
  if (command.match(/\bdocker\b/)) {
    return 'docker';
  }

  // Kubernetes commands - all k8s commands in one category
  if (command.match(/\b(kubectl|helm)\b/)) {
    return 'kubernetes';
  }

  // AWS/Cloud commands
  if (command.match(/\b(aws|terraform|azure|gcloud)\b/)) {
    return 'cloud';
  }

  // Database commands
  if (command.match(/\b(psql|mysql|mongo|sqlite3|redis-cli)\b/)) {
    return 'database';
  }

  // Build tools
  if (command.match(/\b(webpack|parcel|vite|gulp|grunt|make|cmake)\b/)) {
    return 'build';
  }

  // Testing frameworks
  if (command.match(/\b(jest|mocha|cypress|vitest|playwright|pytest)\b/)) {
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
  if (command.match(/\bgo\b/)) {
    return 'go';
  }

  // VS Code Extension publishing tools (vsce / ovsx) — MUST be before Linux
  if (command.match(/\b(vsce|ovsx)\b/)) {
    return 'vscode-extension';
  }

  // Flutter / Dart commands
  if (command.match(/\b(flutter|dart)\b/)) {
    return 'flutter';
  }

  // Gradle / Maven (Java build tools) — before Linux so ./gradlew isn't swallowed
  if (command.match(/\b(gradlew|gradle|mvn|maven)\b/)) {
    return 'gradle-maven';
  }

  // SSH / Remote commands — before Linux (Linux also catches ssh, scp, rsync)
  if (command.match(/\b(ssh|scp|rsync|ssh-keygen|ssh-copy-id)\b/)) {
    return 'ssh-remote';
  }

  // Linux system commands - all Linux commands in one category
  if (command.match(/\b(cd|ls|pwd|mkdir|rmdir|touch|cp|mv|rm|ln|chmod|chown|chgrp|find|grep|sed|awk|sort|uniq|wc|cat|more|less|head|tail|nano|vim|vi|emacs|ssh|scp|rsync|tar|gzip|bzip2|xz|zip|mount|umount|df|du|ps|kill|top|htop|netstat|ss|ping|curl|wget|hostname|uname|free|uptime|whoami|id|groups|useradd|usermod|userdel|groupadd|sudo|su|apt|yum|brew|pacman)\b/)) {
    return 'linux';
  }

  // System tools
  if (command.match(/\b(systemctl|journalctl|crontab|iptables|ufw)\b/)) {
    return 'system';
  }

  // Deployment/CD commands
  if (command.match(/\b(ansible|puppet|chef|deploy|rsync)\b/)) {
    return 'deployment';
  }

  // Network commands
  if (command.match(/\b(nmap|wireshark|tcpdump|nslookup|dig)\b/)) {
    return 'network';
  }

  // Development tools
  if (command.match(/\b(eslint|prettier|stylelint|webpack-dev-server)\b/)) {
    return 'dev-tools';
  }

  return undefined; // No category detected
}
