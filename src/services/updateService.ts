import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface VersionInfo {
  version: string;
  date: string;
  features: string[];
  improvements: string[];
  fixes: string[];
}

export class UpdateService {
  private static instance: UpdateService;
  private context: vscode.ExtensionContext;
  private readonly UPDATE_CHECK_KEY = 'lastUpdateCheck';
  private readonly LAST_SHOWN_VERSION_KEY = 'lastShownVersion';
  private readonly UPDATE_PANEL_SHOWN_KEY = 'updatePanelShownDate';
  private readonly MAX_UPDATE_PANEL_DAYS = 3;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context: vscode.ExtensionContext): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService(context);
    }
    return UpdateService.instance;
  }

  /**
   * Check if update panel should be shown
   */
  public shouldShowUpdatePanel(): boolean {
    try {
      const currentVersion = vscode.extensions.getExtension('freerave.dotcommand')?.packageJSON.version;
      const lastShownVersion = this.context.globalState.get(this.LAST_SHOWN_VERSION_KEY) as string;

      // If this is a new version, show update panel
      if (currentVersion && currentVersion !== lastShownVersion) {
        console.log(`New version detected: ${currentVersion} (was ${lastShownVersion})`);
        return true;
      }

      // Check if we should show based on time limit
      const updateShownDateStr = this.context.globalState.get(this.UPDATE_PANEL_SHOWN_KEY) as string;
      if (!updateShownDateStr) return true; // Never shown before

      const updateShownDate = new Date(updateShownDateStr);
      const now = new Date();
      const daysSinceShown = Math.floor((now.getTime() - updateShownDate.getTime()) / (1000 * 60 * 60 * 24));

      return daysSinceShown < this.MAX_UPDATE_PANEL_DAYS;
    } catch (error) {
      console.error('Error checking update panel:', error);
      return false;
    }
  }

  /**
   * Mark update panel as shown
   */
  public markUpdatePanelShown(): void {
    try {
      const now = new Date();
      const currentVersion = vscode.extensions.getExtension('freerave.dotcommand')?.packageJSON.version;

      this.context.globalState.update(this.UPDATE_PANEL_SHOWN_KEY, now.toISOString());
      if (currentVersion) {
        this.context.globalState.update(this.LAST_SHOWN_VERSION_KEY, currentVersion);
      }

      console.log(`Update panel marked as shown for version ${currentVersion}`);
    } catch (error) {
      console.error('Error marking update panel as shown:', error);
    }
  }

  /**
   * Get changelog content from FEATURES_UPDATE.md
   */
  public getChangelogContent(): string {
    try {
      const extensionPath = vscode.extensions.getExtension('freerave.dotcommand')?.extensionPath;
      if (!extensionPath) {
        throw new Error('Could not find extension path');
      }

      const changelogPath = path.join(extensionPath, 'FEATURES_UPDATE.md');
      if (!fs.existsSync(changelogPath)) {
        throw new Error('FEATURES_UPDATE.md not found');
      }

      return fs.readFileSync(changelogPath, 'utf8');
    } catch (error) {
      console.error('Error reading changelog:', error);
      return this.getFallbackChangelog();
    }
  }

  /**
   * Parse changelog into structured version info
   */
  public parseChangelog(): VersionInfo[] {
    try {
      const content = this.getChangelogContent();
      const versions: VersionInfo[] = [];

      // Split by version headers (looking for [1.x.x] format)
      const versionRegex = /\[([^\]]+)\] - ([^\n]+)/g;
      const sections = content.split(versionRegex);

      for (let i = 1; i < sections.length; i += 3) {
        const version = sections[i];
        const date = sections[i + 1];
        const sectionContent = sections[i + 2];

        const versionInfo: VersionInfo = {
          version: version.trim(),
          date: date.trim(),
          features: [],
          improvements: [],
          fixes: []
        };

        // Extract features from the content (looking for emoji prefixes)
        const lines = sectionContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('🎯') || trimmed.startsWith('🏗️') || trimmed.startsWith('🧠')) {
            versionInfo.features.push(trimmed);
          } else if (trimmed.startsWith('⚡') || trimmed.startsWith('🛠️')) {
            versionInfo.improvements.push(trimmed);
          } else if (trimmed.startsWith('🐛')) {
            versionInfo.fixes.push(trimmed);
          }
        }

        versions.push(versionInfo);
      }

      return versions;
    } catch (error) {
      console.error('Error parsing changelog:', error);
      return [];
    }
  }

  /**
   * Get current version info
   */
  public getCurrentVersionInfo(): VersionInfo | null {
    const versions = this.parseChangelog();
    return versions.length > 0 ? versions[0] : null;
  }

  /**
   * Check for updates (simulate version check)
   */
  public async checkForUpdates(): Promise<boolean> {
    try {
      const lastCheck = this.context.globalState.get(this.UPDATE_CHECK_KEY) as number;
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      // Only check once per day
      if (lastCheck && (now - lastCheck) < oneDay) {
        return false;
      }

      // Mark as checked
      this.context.globalState.update(this.UPDATE_CHECK_KEY, now);

      // Simulate update check (in real implementation, check marketplace API)
      const currentVersion = vscode.extensions.getExtension('freerave.dotcommand')?.packageJSON.version;
      console.log(`Update check completed for version ${currentVersion}`);

      return false; // No update available in this simulation
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  }

  /**
   * Show update notification
   */
  public showUpdateNotification(version: VersionInfo): void {
    const message = `🚀 DotCommand Updated to ${version.version}!`;
    const buttonText = 'See What\'s New';

    vscode.window.showInformationMessage(message, buttonText).then(selection => {
      if (selection === buttonText) {
        // Import and show update panel
        import('../webviews/updatePanel').then(({ UpdatePanel }) => {
          UpdatePanel.createOrShow(this.context.extensionUri);
        }).catch(error => {
          console.error('Error showing update panel:', error);
          vscode.window.showErrorMessage('Could not open update panel');
        });
      }
    });
  }

  /**
   * Fallback changelog content
   */
  private getFallbackChangelog(): string {
    return `# DotCommand Changelog

Unable to load changelog content. Please check the FEATURES_UPDATE.md file.`;
  }
}

/**
 * Initialize update service
 */
export function initializeUpdateService(context: vscode.ExtensionContext): UpdateService {
  return UpdateService.getInstance(context);
}

/**
 * Check and show update panel if needed
 */
export function checkAndShowUpdatePanel(context: vscode.ExtensionContext): void {
  const updateService = UpdateService.getInstance(context);

  if (updateService.shouldShowUpdatePanel()) {
    console.log('Showing update panel based on update service check');

    // Import and show update panel
    import('../webviews/updatePanel').then(({ UpdatePanel }) => {
      UpdatePanel.createOrShow(context.extensionUri);
      updateService.markUpdatePanelShown();
    }).catch(error => {
      console.error('Error showing update panel:', error);
    });
  } else {
    console.log('Update panel not shown (conditions not met)');
  }
}
