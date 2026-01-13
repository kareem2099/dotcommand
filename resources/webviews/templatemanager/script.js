const vscode = acquireVsCodeApi();

// Global State
let currentCategory = 'all';
let allTemplates = [];
let userTemplates = [];
let predefinedCategories = [];
let suggestedTemplates = [];
let currentVariables = []; // 🆕 Stores variables while creating/editing

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadTemplates();
});

function initializeEventListeners() {
    // Main Buttons
    document.getElementById('refreshBtn').addEventListener('click', loadTemplates);
    document.getElementById('createBtn').addEventListener('click', () => openTemplateModal());

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Main Modal Listeners
    document.getElementById('modalClose').addEventListener('click', closeTemplateModal);
    document.getElementById('cancelBtn').addEventListener('click', closeTemplateModal);
    document.getElementById('templateForm').addEventListener('submit', saveTemplate);

    // 🆕 Variable Modal Trigger
    document.getElementById('addVariableBtn').addEventListener('click', openVariableModal);

    // 🆕 Event Delegation for Template Cards (FIXES CSP VIOLATION)
    document.getElementById('templatesContainer').addEventListener('click', (e) => {
        const card = e.target.closest('.template-card');
        if (!card) return;

        const templateId = card.getAttribute('data-id');

        // If delete button clicked
        if (e.target.closest('.btn.danger')) {
            deleteTemplate(templateId);
        }
        // If edit button clicked
        else if (e.target.closest('.btn:not(.danger)')) {
            editTemplate(templateId);
        }
        // If card itself clicked (execute)
        else {
            executeTemplate(templateId);
        }
    });

    // 🆕 Event Delegation for Suggested Templates
    document.getElementById('suggestedTemplates').addEventListener('click', (e) => {
        const card = e.target.closest('.suggested-card');
        if (card) {
            const templateId = card.getAttribute('data-id');
            executeSuggestedTemplate(templateId);
        }
    });

    // 🆕 Event Delegation for Variable Remove Buttons
    document.getElementById('variablesList').addEventListener('click', (e) => {
        const button = e.target.closest('.btn-icon.danger');
        if (button) {
            const index = parseInt(button.getAttribute('data-index'));
            removeVariable(index);
        }
    });

    // 🆕 Event Delegation for Category Tabs
    document.getElementById('categories').addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (tab) {
            const category = tab.getAttribute('data-category');
            switchCategory(category);
        }
    });
}

// ==========================================
// 🔄 Core Loading Logic
// ==========================================

function loadTemplates() {
    vscode.postMessage({ type: 'loadTemplates' });
    vscode.postMessage({ type: 'loadSuggestedTemplates' });
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const filteredTemplates = allTemplates.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.template.toLowerCase().includes(query)
    );
    renderTemplates(filteredTemplates);
}

// ==========================================
// 📝 Main Modal Logic (Template)
// ==========================================

function openTemplateModal(template = null) {
    const modal = document.getElementById('templateModal');
    const form = document.getElementById('templateForm');
    const title = document.getElementById('modalTitle');

    // Reset State
    currentVariables = [];

    if (template) {
        title.textContent = 'Edit Template';
        populateForm(template);
    } else {
        title.textContent = 'Create Template';
        form.reset();
        renderVariablesList(); // Clears the visual list
    }

    modal.classList.add('show');
}

function closeTemplateModal() {
    document.getElementById('templateModal').classList.remove('show');
}

function populateForm(template) {
    document.getElementById('templateName').value = template.name;
    document.getElementById('templateDescription').value = template.description;
    document.getElementById('templateCommand').value = template.template;
    document.getElementById('templateCategory').value = template.category;

    // Load variables into memory and render
    currentVariables = JSON.parse(JSON.stringify(template.variables || []));
    renderVariablesList();
}

function saveTemplate(e) {
    e.preventDefault();

    const name = document.getElementById('templateName').value.trim();
    const description = document.getElementById('templateDescription').value.trim();
    const template = document.getElementById('templateCommand').value.trim();
    const category = document.getElementById('templateCategory').value.trim();

    if (!name || !description || !template) {
        vscode.postMessage({ type: 'showError', message: 'Please fill in all required fields' });
        return;
    }

    const templateData = {
        name,
        description,
        template,
        category: category || 'Custom',
        variables: currentVariables // 🆕 Use the array from memory
    };

    vscode.postMessage({
        type: 'saveTemplate',
        template: templateData
    });

    closeTemplateModal();
}

// ==========================================
// 🧩 Variable Modal Logic (New Feature)
// ==========================================

function openVariableModal() {
    const modal = document.getElementById('variableModal');
    const form = document.getElementById('variableForm');

    form.reset();
    handleVariableTypeChange(); // Reset dropdown visibility
    modal.classList.add('show');

    // Attach event listeners when modal opens (not during initialization)
    document.getElementById('variableModalClose').addEventListener('click', closeVariableModal);
    document.getElementById('cancelVariableBtn').addEventListener('click', closeVariableModal);
    document.getElementById('saveVariableBtn').addEventListener('click', saveVariableFromModal);
    document.getElementById('variableType').addEventListener('change', handleVariableTypeChange);
}

function closeVariableModal() {
    document.getElementById('variableModal').classList.remove('show');
}

function handleVariableTypeChange() {
    const type = document.getElementById('variableType').value;
    const optionsGroup = document.getElementById('dropdownOptionsGroup');
    // Show options field only if type is 'dropdown'
    optionsGroup.style.display = type === 'dropdown' ? 'block' : 'none';
}

function saveVariableFromModal() {
    const name = document.getElementById('variableName').value.trim();
    const desc = document.getElementById('variableDesc').value.trim();
    const type = document.getElementById('variableType').value;
    const defaultVal = document.getElementById('variableDefault').value.trim();
    const optionsStr = document.getElementById('variableOptions').value.trim();

    if (!name) {
        vscode.postMessage({ type: 'showError', message: 'Variable name is required' });
        return;
    }

    // Check for duplicates
    if (currentVariables.some(v => v.name === name)) {
        vscode.postMessage({ type: 'showError', message: 'Variable name must be unique' });
        return;
    }

    const newVariable = {
        name: name,
        description: desc,
        type: type,
        defaultValue: defaultVal || undefined,
        required: true
    };

    // 🆕 Handle Dynamic Options
    if (type === 'dropdown') {
        if (optionsStr) {
            newVariable.options = optionsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        } else {
            newVariable.options = [];
        }
        newVariable.dynamicOptions = 'workspace-files'; // Default for dropdown
    } else if (type === 'git-branch') {
        // Git branch type is handled by type field, no dynamicOptions needed
    } else if (type === 'package') {
        // Package type is handled by type field, no dynamicOptions needed
    } else if (type === 'file' || type === 'folder') {
        // These are handled by inputType in the backend
    }

    currentVariables.push(newVariable);
    renderVariablesList();
    closeVariableModal();
}

function renderVariablesList() {
    const container = document.getElementById('variablesList');
    container.innerHTML = '';

    if (currentVariables.length === 0) {
        container.innerHTML = '<div class="no-variables">No variables added yet.</div>';
        return;
    }

    currentVariables.forEach((variable, index) => {
        const item = document.createElement('div');
        item.className = 'variable-summary-item';
        
        // Icon based on type
        let icon = '📝';
        if (variable.type === 'git-branch') icon = '🌿';
        if (variable.type === 'package') icon = '📦';
        if (variable.type === 'file') icon = '📄';
        if (variable.type === 'folder') icon = '📂';
        if (variable.type === 'dropdown') icon = 'list';

        item.innerHTML = `
            <div class="variable-info">
                <span class="var-name"><strong>{${variable.name}}</strong></span>
                <span class="var-type-badge">${icon} ${variable.type}</span>
                <span class="var-desc">${variable.description || ''}</span>
            </div>
            <button type="button" class="btn-icon danger" data-index="${index}">🗑️</button>
        `;
        container.appendChild(item);
    });
}

// Remove variable from current list
function removeVariable(index) {
    currentVariables.splice(index, 1);
    renderVariablesList();
}

// ==========================================
// 🎨 Rendering Logic (Templates & Categories)
// ==========================================

function renderCategories() {
    const categoriesContainer = document.getElementById('categories');
    categoriesContainer.innerHTML = '';

    // "All" Tab
    const allTab = createCategoryTab('all', 'All Templates', currentCategory === 'all');
    categoriesContainer.appendChild(allTab);

    // Predefined
    predefinedCategories.forEach(category => {
        const isActive = currentCategory === category.name;
        const count = category.templates ? category.templates.length : 0;
        const tab = createCategoryTab(category.name, `${category.name} (${count})`, isActive);
        categoriesContainer.appendChild(tab);
    });

    // "My Templates"
    const myTab = createCategoryTab('my-templates', `My Templates (${userTemplates.length})`, currentCategory === 'my-templates');
    categoriesContainer.appendChild(myTab);
}

function createCategoryTab(id, label, isActive) {
    const tab = document.createElement('div');
    tab.className = `category-tab ${isActive ? 'active' : ''}`;
    tab.textContent = label;
    tab.setAttribute('data-category', id);
    return tab;
}

function switchCategory(category) {
    currentCategory = category;
    renderCategories();
    filterAndRenderTemplates();
}

function filterAndRenderTemplates() {
    let filtered = [];
    if (currentCategory === 'all') {
        filtered = allTemplates;
    } else if (currentCategory === 'my-templates') {
        filtered = userTemplates;
    } else {
        const cat = predefinedCategories.find(c => c.name === currentCategory);
        filtered = cat ? cat.templates : [];
    }
    renderTemplates(filtered);
}

function renderTemplates(templates) {
    const container = document.getElementById('templatesContainer');

    if (!templates || templates.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No templates found</h3>
                <p>Create your first template to get started.</p>
                <button class="btn primary" onclick="document.getElementById('createBtn').click()">Create Template</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `<div class="templates-grid">${templates.map(createTemplateCard).join('')}</div>`;
}

function createTemplateCard(template) {
    return `
        <div class="template-card" data-id="${template.id}">
            <div class="template-header">
                <h3 class="template-title">${template.name}</h3>
                <span class="template-category">${template.category}</span>
            </div>
            <p class="template-description">${template.description}</p>
            <div class="template-command"><code>${template.template}</code></div>
            <div class="template-meta">
                <div class="template-variables">
                    ${(template.variables || []).map(v => `<span class="variable-tag">{${v.name}}</span>`).join('')}
                </div>
                <div class="template-actions">
                    <button class="btn small">✏️</button>
                    <button class="btn small danger">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

function renderSuggestedTemplates() {
    const section = document.getElementById('suggestedSection');
    const container = document.getElementById('suggestedTemplates');

    if (!suggestedTemplates || suggestedTemplates.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = suggestedTemplates.map(t => `
        <div class="suggested-card" data-id="${t.id}">
            <div class="suggested-header-row">
                <span class="suggested-relevance">⚡ ${t.relevanceScore}% match</span>
                <strong>${t.name}</strong>
            </div>
            <div class="suggested-command"><code>${t.template}</code></div>
            <div class="suggested-triggers">
                ${t.matchedTriggers.map(tr => `<span>found ${tr.path}</span>`).join(', ')}
            </div>
        </div>
    `).join('');
}

// ==========================================
// 🚀 Action Handlers (Defined before use for hoisting)
// ==========================================

function executeTemplate(id) {
    vscode.postMessage({ type: 'executeTemplate', templateId: id });
}

function editTemplate(id) {
    const template = allTemplates.find(t => t.id === id);
    if (template) openTemplateModal(template);
}

function deleteTemplate(id) {
    // Use VS Code message API instead of browser confirm (blocked by CSP)
    vscode.postMessage({
        type: 'confirmDelete',
        templateId: id
    });
}

function executeSuggestedTemplate(id) {
    vscode.postMessage({ type: 'executeTemplate', templateId: id });
}

// Make functions globally available for backward compatibility
window.executeTemplate = executeTemplate;
window.editTemplate = editTemplate;
window.deleteTemplate = deleteTemplate;
window.executeSuggestedTemplate = executeSuggestedTemplate;

// ==========================================
// 📨 Message Listener
// ==========================================

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'templatesLoaded':
            allTemplates = message.templates || [];
            userTemplates = message.userTemplates || [];
            predefinedCategories = message.predefinedCategories || [];
            
            // Update Stats
            document.getElementById('totalTemplates').textContent = allTemplates.length;
            document.getElementById('userTemplates').textContent = userTemplates.length;
            document.getElementById('predefinedTemplates').textContent = 
                predefinedCategories.reduce((acc, cat) => acc + (cat.templates ? cat.templates.length : 0), 0);
            
            renderCategories();
            filterAndRenderTemplates();
            break;
        case 'suggestedTemplatesLoaded':
            suggestedTemplates = message.suggestedTemplates || [];
            renderSuggestedTemplates();
            break;
        case 'templateSaved':
            loadTemplates();
            vscode.postMessage({ type: 'showInfo', message: 'Template saved!' });
            break;
        case 'templateDeleted':
            loadTemplates();
            vscode.postMessage({ type: 'showInfo', message: 'Template deleted.' });
            break;
        case 'error':
            vscode.postMessage({ type: 'showError', message: message.message });
            break;
    }
});            loadTemplates();
