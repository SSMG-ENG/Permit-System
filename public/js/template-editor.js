/* ── Template editor (admin) ───────────────────────────── */

let editorTemplate = null;
let editorIsNew = false;

// ── Admin list ──────────────────────────────────────────
async function loadAdmin() {

  const list = document.getElementById('admin-template-list');
  list.innerHTML = '<p>Loading...</p>';

  // ── Contractor Settings panel ───────────────────────
  const settingsPanel = document.getElementById('contractor-settings-panel');
  settingsPanel.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Loading settings...</p>';

  try {
    const settings = await API.getSettings();
    const currentPath = settings.contractorsFile || '';
    settingsPanel.innerHTML = `
      <div class="contractor-settings-card">
        <div class="contractor-settings-header">
          <h3>Approved Contractors</h3>
          <p>Specify the path to an Excel file (.xlsx/.xls) containing approved contractors.
             The file must have a <strong>Contractors ID</strong> column and a <strong>Company Name</strong> column.</p>
        </div>
        <div class="contractor-settings-body">
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label for="contractors-file-path">Excel File Path</label>
            <input type="text" id="contractors-file-path" placeholder="e.g. C:\\Users\\You\\Documents\\contractors.xlsx"
              value="${escapeAttr(currentPath)}" style="font-family:monospace;font-size:0.85rem;">
          </div>
          <div class="contractor-settings-actions">
            <button class="btn btn-primary btn-sm" onclick="saveContractorSettings()">Save Path</button>
            <button class="btn btn-outline btn-sm" onclick="testContractorFile()" id="test-contractors-btn">Test & Reload</button>
            <span id="contractors-status" class="contractors-status"></span>
          </div>
        </div>
      </div>
    `;

    // Show current contractor count if file is set
    if (currentPath) {
      updateContractorStatus();
    }
  } catch (e) {
    settingsPanel.innerHTML = `<p style="color:var(--danger);font-size:0.85rem;">Could not load settings: ${escapeHtml(e.message)}</p>`;
  }

  // ── Template list ───────────────────────────────────
  try {
    const templates = await API.getTemplates();
    if (templates.length === 0) {
      list.innerHTML = '<p>No templates yet. Click "New Template" to create one.</p>';
      return;
    }

    list.innerHTML = templates.map(t => `
      <div class="admin-template-item">
        <div class="admin-template-info">
          <h3>${escapeHtml(t.name)}</h3>
          <p>${escapeHtml(t.description || 'No description')}</p>
        </div>
        <div class="admin-template-actions">
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('editor', {templateId:'${escapeAttr(t.id)}'})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTemplateConfirm('${escapeAttr(t.id)}', '${escapeAttr(t.name)}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = `<p style="color:var(--danger)">Error: ${escapeHtml(e.message)}</p>`;
  }
}

async function saveContractorSettings() {
  const input = document.getElementById('contractors-file-path');
  if (!input) return;
  const filePath = input.value.trim();
  const status = document.getElementById('contractors-status');
  try {
    await API.saveSettings({ contractorsFile: filePath });
    if (status) status.innerHTML = '<span style="color:var(--success)">✓ Saved</span>';
    // Reload the contractors list in memory
    if (filePath) {
      await reloadContractors();
    } else {
      approvedContractors = [];
      if (status) status.innerHTML = '<span style="color:var(--success)">✓ Saved — no file set</span>';
    }
  } catch (e) {
    if (status) status.innerHTML = `<span style="color:var(--danger)">✗ ${escapeHtml(e.message)}</span>`;
  }
}

async function testContractorFile() {
  const btn = document.getElementById('test-contractors-btn');
  const status = document.getElementById('contractors-status');
  if (btn) btn.disabled = true;
  if (status) status.innerHTML = '<span style="color:var(--text-muted)">Loading…</span>';
  try {
    await reloadContractors();
    if (status) {
      if (approvedContractors.length > 0) {
        status.innerHTML = `<span style="color:var(--success)">✓ ${approvedContractors.length} contractor${approvedContractors.length !== 1 ? 's' : ''} loaded</span>`;
      } else {
        status.innerHTML = '<span style="color:var(--warning)">⚠ File read OK but no contractors found</span>';
      }
    }
  } catch (e) {
    if (status) status.innerHTML = `<span style="color:var(--danger)">✗ ${escapeHtml(e.message)}</span>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function updateContractorStatus() {
  const status = document.getElementById('contractors-status');
  if (!status) return;
  try {
    const contractors = await API.getContractors();
    approvedContractors = contractors;
    status.innerHTML = contractors.length > 0
      ? `<span style="color:var(--success)">✓ ${contractors.length} contractor${contractors.length !== 1 ? 's' : ''} loaded</span>`
      : '<span style="color:var(--warning)">⚠ No contractors found in file</span>';
  } catch (e) {
    status.innerHTML = `<span style="color:var(--danger)">✗ ${escapeHtml(e.message)}</span>`;
  }
}

async function reloadContractors() {
  approvedContractors = await loadApprovedContractors(true);
}

async function deleteTemplateConfirm(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
  try {
    await API.deleteTemplate(id);
    showToast('Template deleted', 'success');
    loadAdmin();
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

function createNewTemplate() {
  navigateTo('editor', { isNew: true });
}

// ── Load editor ─────────────────────────────────────────
async function loadTemplateEditor(templateId) {
  editorIsNew = false;
  try {
    editorTemplate = await API.getTemplate(templateId);
    document.getElementById('editor-title').textContent = `Edit: ${editorTemplate.name}`;
    renderEditor();
  } catch (e) {
    showToast('Failed to load template', 'error');
    navigateTo('admin');
  }
}

function loadNewTemplateEditor() {
  editorIsNew = true;
  editorTemplate = {
    id: '',
    name: '',
    description: '',
    colour: '#3498db',
    sections: [
      {
        title: 'General Information',
        type: 'authoriser',
        fields: [
          { id: 'permit_number', label: 'Permit Number', type: 'text', required: true },
          { id: 'date_issued', label: 'Date Issued', type: 'date', required: true },
          { id: 'location', label: 'Location of Work', type: 'text', required: true },
          { id: 'description_of_work', label: 'Description of Work', type: 'textarea', required: true },
        ],
      },
    ],
    handwrittenSections: [
      {
        title: 'Worker Acknowledgement',
        description: 'To be completed by the person carrying out the work.',
        fields: [
          { label: 'Worker Name (Print)', lines: 1 },
          { label: 'Worker Signature', lines: 1 },
          { label: 'Date / Time', lines: 1 },
        ],
      },
    ],
  };
  document.getElementById('editor-title').textContent = 'Create New Template';
  renderEditor();
}

// ── Render editor UI ────────────────────────────────────
function renderEditor() {
  const t = editorTemplate;
  const container = document.getElementById('editor-content');

  let html = '';

  // Basic info panel
  html += `
    <div class="editor-panel">
      <h2>Template Details</h2>
      <div class="form-group">
        <label>Template ID (no spaces, used in URL)</label>
        <input type="text" id="ed-id" value="${escapeAttr(t.id)}" ${editorIsNew ? '' : 'disabled'} placeholder="e.g. hot-work" pattern="[a-zA-Z0-9_-]+">
      </div>
      <div class="form-group">
        <label>Template Name</label>
        <input type="text" id="ed-name" value="${escapeAttr(t.name)}" placeholder="e.g. Hot Work Permit">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="ed-description" placeholder="Brief description of when this permit is used">${escapeHtml(t.description || '')}</textarea>
      </div>
    </div>
  `;

  // Sections (authoriser fills in)
  html += `<div class="editor-panel"><h2>Sections (Filled in by Authoriser)</h2>`;
  t.sections.forEach((section, sIdx) => {
    html += renderEditorSection(section, sIdx);
  });
  html += `<button class="btn btn-secondary mt-1" onclick="addSection()">+ Add Section</button>`;
  html += `</div>`;

  // Handwritten sections
  html += `<div class="editor-panel"><h2>Handwritten Sections (Filled in by Worker)</h2>`;
  (t.handwrittenSections || []).forEach((section, hIdx) => {
    html += renderEditorHandwrittenSection(section, hIdx);
  });
  html += `<button class="btn btn-secondary mt-1" onclick="addHandwrittenSection()">+ Add Handwritten Section</button>`;
  html += `</div>`;

  // Save / cancel
  html += `
    <div class="editor-actions">
      <button class="btn btn-secondary" onclick="navigateTo('admin')">Cancel</button>
      <button class="btn btn-primary" onclick="saveTemplate()">Save Template</button>
    </div>
  `;

  container.innerHTML = html;
}

function renderEditorSection(section, sIdx) {
  let html = `<div class="editor-section">`;
  html += `
    <h3>
      <input type="text" value="${escapeAttr(section.title)}" onchange="editorTemplate.sections[${sIdx}].title=this.value" placeholder="Section title" style="flex:1;font-weight:600;border:none;font-size:inherit;background:transparent;">
      <button class="btn btn-danger btn-sm" onclick="removeSection(${sIdx})">Remove Section</button>
    </h3>
  `;

  section.fields.forEach((field, fIdx) => {
    if (field.highlight === undefined) field.highlight = false;
    html += `
      <div class="editor-field-row">
        <input type="text" value="${escapeAttr(field.label)}" placeholder="Field label" onchange="editorTemplate.sections[${sIdx}].fields[${fIdx}].label=this.value">
        <select onchange="changeFieldType(${sIdx},${fIdx},this.value)">
          <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
          <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Text Area</option>
          <option value="date" ${field.type === 'date' ? 'selected' : ''}>Date</option>
          <option value="time" ${field.type === 'time' ? 'selected' : ''}>Time</option>
          <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
          <option value="select" ${field.type === 'select' ? 'selected' : ''}>Dropdown</option>
        </select>
        <div class="editor-field-checkboxes">
          <label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;white-space:nowrap;">
            <input type="checkbox" ${field.required ? 'checked' : ''} onchange="editorTemplate.sections[${sIdx}].fields[${fIdx}].required=this.checked"> Req
          </label>
          <label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;white-space:nowrap;">
            <input type="checkbox" ${field.highlight ? 'checked' : ''} onchange="editorTemplate.sections[${sIdx}].fields[${fIdx}].highlight=this.checked"> Highlight
          </label>
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeField(${sIdx},${fIdx})">×</button>
      </div>
    `;
    // Show options editor for 'select' type
    if (field.type === 'select') {
      html += `
        <div class="options-editor" style="margin-left:0.4rem;margin-bottom:0.5rem;">
          <input type="text" value="${escapeAttr((field.options || []).join(', '))}" placeholder="Options (comma-separated)" onchange="editorTemplate.sections[${sIdx}].fields[${fIdx}].options=this.value.split(',').map(s=>s.trim()).filter(Boolean)">
        </div>
      `;
    }
  });

  html += `<button class="btn btn-outline btn-sm mt-1" onclick="addField(${sIdx})">+ Add Field</button>`;
  html += `</div>`;
  return html;
}

function renderEditorHandwrittenSection(section, hIdx) {
  let html = `<div class="editor-hw-section">`;
  html += `
    <h3>
      <input type="text" value="${escapeAttr(section.title)}" onchange="editorTemplate.handwrittenSections[${hIdx}].title=this.value" placeholder="Section title" style="flex:1;font-weight:600;border:none;font-size:inherit;background:transparent;">
      <button class="btn btn-danger btn-sm" onclick="removeHandwrittenSection(${hIdx})">Remove</button>
    </h3>
    <div class="form-group mb-1">
      <input type="text" value="${escapeAttr(section.description || '')}" onchange="editorTemplate.handwrittenSections[${hIdx}].description=this.value" placeholder="Description / instructions (optional)" style="width:100%;padding:0.35rem 0.5rem;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;">
    </div>
  `;

  (section.fields || []).forEach((f, fIdx) => {
    const fieldType = f.type || 'line';
    const isLine = fieldType !== 'checkbox';
    if (f.highlight === undefined) f.highlight = false;
    html += `
      <div class="editor-hw-field-row">
        <input type="text" value="${escapeAttr(f.label)}" placeholder="Field label" onchange="editorTemplate.handwrittenSections[${hIdx}].fields[${fIdx}].label=this.value">
        <select onchange="changeHandwrittenFieldType(${hIdx},${fIdx},this.value)">
          <option value="line" ${isLine ? 'selected' : ''}>Empty Line</option>
          <option value="checkbox" ${fieldType === 'checkbox' ? 'selected' : ''}>Tickbox</option>
        </select>
        <input type="number" value="${f.lines || 1}" min="1" max="10" onchange="editorTemplate.handwrittenSections[${hIdx}].fields[${fIdx}].lines=parseInt(this.value)||1" title="Number of blank lines" style="width:60px;" ${isLine ? '' : 'disabled'}>
        <div class="editor-hw-field-checkboxes">
          <label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;white-space:nowrap;">
            <input type="checkbox" ${f.highlight ? 'checked' : ''} onchange="editorTemplate.handwrittenSections[${hIdx}].fields[${fIdx}].highlight=this.checked"> Highlight
          </label>
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeHandwrittenField(${hIdx},${fIdx})">×</button>
      </div>
    `;
  });

  html += `<button class="btn btn-outline btn-sm mt-1" onclick="addHandwrittenField(${hIdx})">+ Add Field</button>`;
  html += `</div>`;
  return html;
}

// ── Editor actions ──────────────────────────────────────
function addSection() {
  editorTemplate.sections.push({
    title: 'New Section',
    type: 'authoriser',
    fields: [],
  });
  renderEditor();
}

function removeSection(sIdx) {
  if (!confirm('Remove this section and all its fields?')) return;
  editorTemplate.sections.splice(sIdx, 1);
  renderEditor();
}

async function addField(sIdx) {
  const fieldKind = await chooseFieldTypeDialog();
  if (!fieldKind) return;

  const isCheckbox = fieldKind === 'checkbox';
  const count = editorTemplate.sections[sIdx].fields.length;
  editorTemplate.sections[sIdx].fields.push({
    id: `field_${Date.now()}_${count}`,
    label: isCheckbox ? 'New Tickbox' : 'New Field',
    type: isCheckbox ? 'checkbox' : 'text',
    required: false,
  });
  renderEditor();
}

function removeField(sIdx, fIdx) {
  editorTemplate.sections[sIdx].fields.splice(fIdx, 1);
  renderEditor();
}

function changeFieldType(sIdx, fIdx, newType) {
  editorTemplate.sections[sIdx].fields[fIdx].type = newType;
  if (newType === 'select' && !editorTemplate.sections[sIdx].fields[fIdx].options) {
    editorTemplate.sections[sIdx].fields[fIdx].options = [];
  }
  renderEditor();
}

function addHandwrittenSection() {
  if (!editorTemplate.handwrittenSections) editorTemplate.handwrittenSections = [];
  editorTemplate.handwrittenSections.push({
    title: 'New Section',
    description: '',
    fields: [{ label: 'Name', lines: 1 }, { label: 'Signature', lines: 1 }],
  });
  renderEditor();
}

function removeHandwrittenSection(hIdx) {
  if (!confirm('Remove this handwritten section?')) return;
  editorTemplate.handwrittenSections.splice(hIdx, 1);
  renderEditor();
}

async function addHandwrittenField(hIdx) {
  const fieldKind = await chooseFieldTypeDialog();
  if (!fieldKind) return;

  const isCheckbox = fieldKind === 'checkbox';
  editorTemplate.handwrittenSections[hIdx].fields.push(
    isCheckbox
      ? { label: 'New Tickbox', type: 'checkbox', lines: 1 }
      : { label: 'New Field', type: 'line', lines: 1 }
  );
  renderEditor();
}

function changeHandwrittenFieldType(hIdx, fIdx, newType) {
  const field = editorTemplate.handwrittenSections[hIdx].fields[fIdx];
  field.type = newType;
  if (newType === 'checkbox') {
    field.lines = 1;
  } else if (!field.lines || field.lines < 1) {
    field.lines = 1;
  }
  renderEditor();
}

function removeHandwrittenField(hIdx, fIdx) {
  editorTemplate.handwrittenSections[hIdx].fields.splice(fIdx, 1);
  renderEditor();
}

// ── Save template ───────────────────────────────────────
async function saveTemplate() {
  // Gather basic info from DOM
  const id = (document.getElementById('ed-id').value || '').trim();
  const name = (document.getElementById('ed-name').value || '').trim();
  const description = (document.getElementById('ed-description').value || '').trim();

  // Debug: log when saveTemplate is called and the template data
  console.log('[DEBUG] saveTemplate called');
  console.log('[DEBUG] editorTemplate before save:', JSON.stringify(editorTemplate, null, 2));

  if (!id || !name) {
    showToast('Template ID and Name are required', 'error');
    return;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    showToast('Template ID must only contain letters, numbers, hyphens, and underscores', 'error');
    return;
  }

  editorTemplate.id = id;
  editorTemplate.name = name;
  editorTemplate.description = description;

  // Generate unique IDs for fields that don't have one
  editorTemplate.sections.forEach(section => {
    section.fields.forEach((field, i) => {
      if (!field.id) field.id = `field_${Date.now()}_${i}`;
    });
  });

  try {
    if (editorIsNew) {
      await API.createTemplate(editorTemplate);
      showToast('Template created!', 'success');
    } else {
      await API.updateTemplate(editorTemplate.id, editorTemplate);
      showToast('Template saved!', 'success');
    }
    navigateTo('admin');
  } catch (e) {
    console.error('[DEBUG] Save failed:', e);
    showToast('Save failed: ' + e.message, 'error');
  }
}
