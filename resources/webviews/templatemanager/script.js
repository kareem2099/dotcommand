const vscode = acquireVsCodeApi();
let currentCategory = 'all';
let allTemplates = [];
let userTemplates = [];
let predefinedCategories = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadTemplates();
});

function initializeEventListeners() {
    // Buttons
    document.getElementById('refreshBtn').addEventListener('click', loadTemplates);
    document.getElementById('createBtn').addEventListener('click', () => openTemplateModal());

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Modal
    document.getElementById('modalClose').addEventListener('click', closeTemplateModal);
    document.getElementById('cancelBtn').addEventListener('click', closeTemplateModal);
    document.getElementById('addVariableBtn').addEventListener('click', addVariable);

    // Form
    document.getElementById('templateForm').addEventListener('submit', saveTemplate);
}

function loadTemplates() {
    vscode.postMessage({ type: 'loadTemplates' });
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

function openTemplateModal(template = null) {
    const modal = document.getElementById('templateModal');
    const form = document.getElementById('templateForm');
    const title = document.getElementById('modalTitle');

    if (template) {
        title.textContent = 'Edit Template';
        populateForm(template);
    } else {
        title.textContent = 'Create Template';
        form.reset();
        document.getElementById('variablesList').innerHTML = '';
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

    const variablesList = document.getElementById('variablesList');
    variablesList.innerHTML = '';

    template.variables.forEach(variable => {
        addVariableToList(variable);
    });
}

function addVariable() {
    const variable = {
        name: '',
        description: '',
        defaultValue: '',
        required: true
    };
    addVariableToList(variable);
}

function addVariableToList(variable) {
    const variablesList = document.getElementById('variablesList');
    const variableItem = document.createElement('div');
    variableItem.className = 'variable-item';

    variableItem.innerHTML = `
        <input type="text" class="form-input variable-name-input" placeholder="Variable name" value="${variable.name}" style="width: 120px;">
        <input type="text" class="form-input variable-desc-input" placeholder="Description" value="${variable.description}" style="flex: 1;">
        <input type="text" class="form-input variable-default-input" placeholder="Default value" value="${variable.defaultValue || ''}" style="width: 100px;">
        <button type="button" class="variable-remove" onclick="removeVariable(this)">×</button>
    `;

    variablesList.appendChild(variableItem);
}

function removeVariable(button) {
    button.closest('.variable-item').remove();
}

function saveTemplate(e) {
    e.preventDefault();

    const name = document.getElementById('templateName').value.trim();
    const description = document.getElementById('templateDescription').value.trim();
    const template = document.getElementById('templateCommand').value.trim();
    const category = document.getElementById('templateCategory').value.trim();

    if (!name || !description || !template) {
        vscode.postMessage({
            type: 'showError',
            message: 'Please fill in all required fields'
        });
        return;
    }

    // Collect variables
    const variables = [];
    const variableItems = document.querySelectorAll('.variable-item');

    variableItems.forEach(item => {
        const nameInput = item.querySelector('.variable-name-input');
        const descInput = item.querySelector('.variable-desc-input');
        const defaultInput = item.querySelector('.variable-default-input');

        if (nameInput.value.trim()) {
            variables.push({
                name: nameInput.value.trim(),
                description: descInput.value.trim(),
                defaultValue: defaultInput.value.trim() || undefined,
                required: true
            });
        }
    });

    const templateData = {
        name,
        description,
        template,
        category: category || 'Custom',
        variables
    };

    vscode.postMessage({
        type: 'saveTemplate',
        template: templateData
    });

    closeTemplateModal();
}

function renderCategories() {
    const categoriesContainer = document.getElementById('categories');
    categoriesContainer.innerHTML = '';

    // Add "All" category
    const allTab = document.createElement('div');
    allTab.className = `category-tab ${currentCategory === 'all' ? 'active' : ''}`;
    allTab.textContent = 'All Templates';
    allTab.onclick = () => switchCategory('all');
    categoriesContainer.appendChild(allTab);

    // Add predefined categories
    predefinedCategories.forEach(category => {
        const tab = document.createElement('div');
        tab.className = `category-tab ${currentCategory === category.name ? 'active' : ''}`;
        tab.textContent = `${category.name} (${category.templates.length})`;
        tab.onclick = () => switchCategory(category.name);
        categoriesContainer.appendChild(tab);
    });

    // Add "My Templates" category
    const myTemplatesTab = document.createElement('div');
    myTemplatesTab.className = `category-tab ${currentCategory === 'my-templates' ? 'active' : ''}`;
    myTemplatesTab.textContent = `My Templates (${userTemplates.length})`;
    myTemplatesTab.onclick = () => switchCategory('my-templates');
    categoriesContainer.appendChild(myTemplatesTab);
}

function switchCategory(category) {
    currentCategory = category;
    renderCategories();
    filterAndRenderTemplates();
}

function filterAndRenderTemplates() {
    let filteredTemplates = [];

    if (currentCategory === 'all') {
        filteredTemplates = allTemplates;
    } else if (currentCategory === 'my-templates') {
        filteredTemplates = userTemplates;
    } else {
        // Find templates from predefined category
        const category = predefinedCategories.find(cat => cat.name === currentCategory);
        filteredTemplates = category ? category.templates : [];
    }

    renderTemplates(filteredTemplates);
}

function renderTemplates(templates) {
    const container = document.getElementById('templatesContainer');

    if (templates.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No templates found</h3>
                <p>Create your first template to get started with dynamic command execution.</p>
                <button class="btn primary" onclick="document.getElementById('createBtn').click()">Create Template</button>
            </div>
        `;
        return;
    }

    const templatesHtml = templates.map(template => `
        <div class="template-card" onclick="executeTemplate('${template.id}')">
            <div class="template-header">
                <h3 class="template-title">${template.name}</h3>
                <span class="template-category">${template.category}</span>
            </div>
            <p class="template-description">${template.description}</p>
            <div class="template-command">${template.template}</div>
            <div class="template-meta">
                <div class="template-variables">
                    ${template.variables.map(v => `<span class="variable-tag">{${v.name}}</span>`).join('')}
                </div>
                <div class="template-actions">
                    <button class="btn" onclick="event.stopPropagation(); editTemplate('${template.id}')">✏️ Edit</button>
                    <button class="btn danger" onclick="event.stopPropagation(); deleteTemplate('${template.id}')">🗑️ Delete</button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `<div class="templates-grid">${templatesHtml}</div>`;
}

function executeTemplate(templateId) {
    vscode.postMessage({
        type: 'executeTemplate',
        templateId: templateId
    });
}

function editTemplate(templateId) {
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
        openTemplateModal(template);
    }
}

function deleteTemplate(templateId) {
    if (confirm('Are you sure you want to delete this template?')) {
        vscode.postMessage({
            type: 'deleteTemplate',
            templateId: templateId
        });
    }
}

// Handle messages from extension
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type) {
        case 'templatesLoaded':
            allTemplates = message.templates;
            userTemplates = message.userTemplates;
            predefinedCategories = message.predefinedCategories;

            // Update stats
            document.getElementById('totalTemplates').textContent = allTemplates.length;
            document.getElementById('userTemplates').textContent = userTemplates.length;
            document.getElementById('predefinedTemplates').textContent =
                predefinedCategories.reduce((sum, cat) => sum + cat.templates.length, 0);
            document.getElementById('totalUsage').textContent =
                allTemplates.reduce((sum, t) => sum + (t.usageCount || 0), 0);

            renderCategories();
            filterAndRenderTemplates();
            break;

        case 'templateSaved':
            loadTemplates();
            vscode.postMessage({
                type: 'showInfo',
                message: 'Template saved successfully!'
            });
            break;

        case 'templateDeleted':
            loadTemplates();
            vscode.postMessage({
                type: 'showInfo',
                message: 'Template deleted successfully!'
            });
            break;

        case 'error':
            vscode.postMessage({
                type: 'showError',
                message: message.message
            });
            break;
    }
});

// Make functions global for onclick handlers
window.executeTemplate = executeTemplate;
window.editTemplate = editTemplate;
window.deleteTemplate = deleteTemplate;
window.removeVariable = removeVariable;
