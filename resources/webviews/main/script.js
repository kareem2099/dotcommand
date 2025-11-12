/**
 * Webview Manager for DotCommand Extension
 * Handles communication between the webview and the VS Code extension
 */
export class WebviewManager {
    constructor() {
        this.commands = [];
        this.filteredCommands = [];
        this.vscode = null;
    }

    /**
     * Initialize the webview
     */
    async initialize() {
        // Get reference to VS Code API
        this.vscode = acquireVsCodeApi();

        // Load styles
        await this.loadStyles();

        // Set up event listeners
        this.setupEventListeners();

        // Request initial data from extension
        this.requestCommands();

        // Listen for messages from extension
        window.addEventListener('message', this.handleMessage.bind(this));
    }

    /**
     * Load CSS styles into the webview
     */
    async loadStyles() {
        try {
            const response = await fetch('./styles.css');
            const css = await response.text();
            const styleElement = document.getElementById('webview-styles');
            if (styleElement) {
                styleElement.textContent = css;
            }
        } catch (error) {
            console.warn('Could not load external styles, using inline styles');
        }
    }

    /**
     * Set up DOM event listeners
     */
    setupEventListeners() {
        // Search input handler
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.searchCommands();
            }, 300));
        }
    }

    /**
     * Request commands from the extension
     */
    requestCommands() {
        this.vscode.postMessage({
            command: 'getCommands'
        });
    }

    /**
     * Handle messages from the VS Code extension
     */
    handleMessage(event) {
        const message = event.data;

        switch (message.command) {
            case 'updateCommands':
                this.updateCommands(message.commands);
                break;
            case 'commandDeleted':
                this.showNotification('Command deleted successfully', 'success');
                this.requestCommands(); // Refresh the list
                break;
            case 'commandCopied':
                this.showNotification(`Command copied: ${message.copiedCommand}`, 'info');
                break;
            case 'error':
                this.showNotification(message.error, 'error');
                break;
        }
    }

    /**
     * Update the commands display
     */
    updateCommands(commands) {
        this.commands = commands || [];
        this.filteredCommands = [...this.commands];

        const container = document.getElementById('commandsContainer');
        const countElement = document.getElementById('command-count');

        if (!container || !countElement) return;

        // Update count
        countElement.textContent = this.commands.length;

        if (this.commands.length === 0) {
            container.innerHTML = '<div class="no-commands">No commands saved yet. Use Ctrl+Shift+S to save your first command!</div>';
            return;
        }

        // Render commands
        container.innerHTML = this.renderCommands();
    }

    /**
     * Render the commands list
     */
    renderCommands() {
        if (this.filteredCommands.length === 0) {
            return '<div class="no-commands">No commands found matching your search.</div>';
        }

        return this.filteredCommands.map(command => `
            <div class="command-item" data-id="${command.id}">
                <div class="command-header">
                    <div class="command-name">
                        ${this.escapeHtml(command.name || 'Unnamed Command')}
                    </div>
                    <div class="command-actions">
                        <button class="btn-icon" onclick="window.webviewManager.copyCommand('${this.escapeHtml(command.command)}')" title="Copy Command">
                            📋
                        </button>
                        <button class="btn-icon" onclick="window.webviewManager.editCommand('${command.id}')" title="Edit Command">
                            ✏️
                        </button>
                        <button class="btn-icon delete" onclick="window.webviewManager.deleteCommand('${command.id}')" title="Delete Command">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="command-content">
                    <code class="command-text">${this.escapeHtml(command.command)}</code>
                </div>
                ${command.category ? `<div class="command-category">${this.escapeHtml(command.category)}</div>` : ''}
                <div class="command-timestamp">
                    Saved: ${new Date(command.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('');
    }

    /**
     * Search commands
     */
    searchCommands() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput ? searchInput.value.toLowerCase() : '';

        if (!query.trim()) {
            this.filteredCommands = [...this.commands];
        } else {
            this.filteredCommands = this.commands.filter(cmd =>
                (cmd.name && cmd.name.toLowerCase().includes(query)) ||
                cmd.command.toLowerCase().includes(query) ||
                (cmd.category && cmd.category.toLowerCase().includes(query))
            );
        }

        // Update display
        const container = document.getElementById('commandsContainer');
        if (container) {
            container.innerHTML = this.renderCommands();
        }
    }

    /**
     * Copy command to clipboard
     */
    copyCommand(command) {
        this.vscode.postMessage({
            command: 'copyCommand',
            command: command
        });
    }

    /**
     * Delete a command
     */
    deleteCommand(id) {
        // Show confirmation dialog
        if (confirm('Are you sure you want to delete this command?')) {
            this.vscode.postMessage({
                command: 'deleteCommand',
                id: id
            });
        }
    }

    /**
     * Edit a command (placeholder for future implementation)
     */
    editCommand(id) {
        // For now, just show a message
        this.showNotification('Edit functionality coming soon!', 'info');

        // In the future, this could open an edit dialog
        this.vscode.postMessage({
            command: 'editCommand',
            id: id
        });
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: '500',
            zIndex: '1000',
            animation: 'slideIn 0.3s ease-out',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Set colors based on type
        const colors = {
            success: { bg: '#2d5a3d', border: '#4a7c59', color: '#ffffff' },
            error: { bg: '#5d2e2e', border: '#7c4a4a', color: '#ffffff' },
            info: { bg: '#2e3d5d', border: '#4a5a7c', color: '#ffffff' },
            warning: { bg: '#5d4d2e', border: '#7c6b4a', color: '#ffffff' }
        };

        const colorScheme = colors[type] || colors.info;
        Object.assign(notification.style, {
            backgroundColor: colorScheme.bg,
            border: `1px solid ${colorScheme.border}`,
            color: colorScheme.color
        });

        // Add to DOM
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    /**
     * Escape HTML characters
     */
    escapeHtml(text) {
        if (!text) return '';

        const htmlEscapes = {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        return text.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char] || char);
    }

    /**
     * Debounce function for search input
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Make manager globally available for HTML onclick handlers
window.webviewManager = new WebviewManager();

// Add notification animations to CSS
const notificationStyles = `
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.notification {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
}
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
