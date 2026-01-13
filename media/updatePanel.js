// ===== UPDATE PANEL WEBVIEW =====

(function() {
    'use strict';

    const vscode = acquireVsCodeApi();

    // ===== INITIALIZATION =====
    function initialize() {
        console.log('Update panel webview initialized');

        // Set up message listener
        window.addEventListener('message', handleMessage);

        // Parse and display changelog
        if (window.changelogContent) {
            displayChangelog(window.changelogContent);
        }
    }

    // ===== MESSAGE HANDLING =====
    function handleMessage(event) {
        const message = event.data;
        console.log('Received message from extension:', message.command, message.data);

        switch (message.command) {
            case 'closePanel':
                // Handled by the closePanel function
                break;
            default:
                // Handle any future messages if needed
                break;
        }
    }

    // ===== CHANGELOG PARSING AND DISPLAY =====
    function displayChangelog(markdownContent) {
        const container = document.getElementById('changelogContent');
        if (!container) return;

        // Parse markdown and convert to HTML
        const htmlContent = parseMarkdownToHtml(markdownContent);
        container.innerHTML = htmlContent;
    }

    function parseMarkdownToHtml(markdown) {
        let html = markdown;

        // Convert headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Convert version headers with badges
        html = html.replace(/^## \[([^\]]+)\] - ([^\n]+)$/gm, '<div class="version-badge">$1</div><h2>$1 <small>$2</small></h2>');

        // Convert bold text
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Convert italic text
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Convert inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // Convert blockquotes
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

        // Convert lists
        html = convertLists(html);

        // Convert paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';

        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>\s*<h/g, '<h');
        html = html.replace(/<\/h[1-6]>\s*<\/p>/g, '</h1>');
        html = html.replace(/<p>\s*<blockquote/g, '<blockquote');
        html = html.replace(/<\/blockquote>\s*<\/p>/g, '</blockquote>');

        // Group related sections
        html = groupFeatureSections(html);

        return html;
    }

    function convertLists(text) {
        const lines = text.split('\n');
        let listStack = []; // array of 'ul' or 'ol'
        let currentLevel = 0;
        let result = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);

            if (listMatch) {
                const indent = listMatch[1].length;
                const bullet = listMatch[2];
                const content = listMatch[3];
                const newType = bullet.match(/\d+\./) ? 'ol' : 'ul';
                const level = Math.floor(indent / 2); // assuming 2 spaces per nesting level

                // Adjust nesting for level changes
                while (currentLevel > level) {
                    const closeType = listStack.pop();
                    result += `</${closeType}>`;
                    currentLevel--;
                }

                while (currentLevel < level) {
                    listStack.push(newType);
                    result += `<${newType}>`;
                    currentLevel++;
                }

                // If same level but different type, close and reopen the list
                if (currentLevel > 0 && listStack[listStack.length - 1] !== newType) {
                    const prevType = listStack.pop();
                    result += `</${prevType}>`;
                    listStack.push(newType);
                    result += `<${newType}>`;
                }

                result += `<li>${content}</li>`;
            } else {
                // Close all open lists when non-list line encountered
                while (currentLevel > 0) {
                    const closeType = listStack.pop();
                    result += `</${closeType}>`;
                    currentLevel--;
                }
                result += line + '\n';
            }
        }

        // Close any remaining open lists
        while (currentLevel > 0) {
            const closeType = listStack.pop();
            result += `</${closeType}>`;
            currentLevel--;
        }

        return result;
    }

    function groupFeatureSections(html) {
        // Group sections under major features
        const sections = [
            { title: '🧠 Smart Context Awareness', keywords: ['context', 'awareness', 'smart', 'suggestion', 'template'] },
            { title: '⚡ Quick Access Features', keywords: ['quick', 'access', 'status', 'bar', 'shortcut'] },
            { title: '🏗️ Framework Support', keywords: ['react', 'vue', 'angular', 'typescript', 'framework'] },
            { title: '🛠️ Technical Improvements', keywords: ['technical', 'improvement', 'performance', 'optimization'] },
            { title: '🐛 Bug Fixes', keywords: ['fix', 'bug', 'issue', 'error'] }
        ];

        let result = html;

        sections.forEach(section => {
            const regex = new RegExp(`<h3>${section.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h3>(.*?)(?=<h[1-3]|$)`, 'gis');
            result = result.replace(regex, (match, content) => {
                return `<div class="feature-category"><h3>${section.title}</h3><ul>${content.trim()}</ul></div>`;
            });
        });

        return result;
    }

    // ===== UTILITY FUNCTIONS =====
    function closePanel() {
        vscode.postMessage({
            command: 'closePanel'
        });
    }

    // Expose closePanel globally for inline onclick handlers
    window.closePanel = closePanel;

    // ===== INITIALIZATION =====
    document.addEventListener('DOMContentLoaded', function() {
        initialize();
    });

})();
