/* ── Permit form renderer ──────────────────────────────── */

let currentGeneratedPermitNumber = null;

async function loadPermitForm(templateId) {
  currentTemplateId = templateId;
  try {
    currentTemplate = await API.getTemplate(templateId);
  } catch (e) {
    showToast('Failed to load template', 'error');
    navigateTo('home');
    return;
  }

  document.getElementById('form-title').textContent = currentTemplate.name;
  document.getElementById('form-description').textContent = currentTemplate.description || '';

  // Generate permit number preview (not saved until printed)
  currentGeneratedPermitNumber = getNextPermitNumberPreview(templateId);
  // Initialize pending print values
  pendingPrintPermitNumber = currentGeneratedPermitNumber;
  pendingPrintTemplateId = templateId;

  const container = document.getElementById('form-sections');
  container.innerHTML = '';

  currentTemplate.sections.forEach((section, sIdx) => {
    const div = document.createElement('div');
    div.className = 'form-section';
    div.innerHTML = `<h2>${escapeHtml(section.title)}</h2>`;

    section.fields.forEach(field => {
      div.appendChild(renderFormField(field, sIdx));
    });

    container.appendChild(div);
  });
}

function renderFormField(field, sectionIndex) {
  const group = document.createElement('div');
  const fieldId = `field_${field.id}`;

  if (field.type === 'checkbox') {
    group.className = 'form-check';
    group.innerHTML = `
      <input type="checkbox" id="${escapeAttr(fieldId)}" data-field-id="${escapeAttr(field.id)}">
      <label for="${escapeAttr(fieldId)}">${escapeHtml(field.label)}</label>
    `;
  } else {
    group.className = 'form-group';
    const requiredClass = field.required ? 'required' : '';
    const requiredAttr = field.required ? 'required' : '';

    let input = '';
    
    // Special handling for permit_number field
    if (field.id === 'permit_number') {
      input = `<input type="text" id="${escapeAttr(fieldId)}" data-field-id="${escapeAttr(field.id)}" value="${escapeAttr(currentGeneratedPermitNumber || '')}" readonly style="background:#f0f0f0;cursor:not-allowed;">`;
    } else {
      switch (field.type) {
        case 'textarea':
          input = `<textarea id="${escapeAttr(fieldId)}" data-field-id="${escapeAttr(field.id)}" ${requiredAttr} placeholder="${escapeAttr(field.placeholder || '')}"></textarea>`;
          break;
        case 'select':
          const options = (field.options || []).map(o => `<option value="${escapeAttr(o)}">${escapeHtml(o)}</option>`).join('');
          input = `<select id="${escapeAttr(fieldId)}" data-field-id="${escapeAttr(field.id)}" ${requiredAttr}><option value="">-- Select --</option>${options}</select>`;
          break;
        case 'date':
          // Default to today if label is 'Date Issued'
          let defaultDate = '';
          if (/date issued/i.test(field.label)) {
            const d = new Date();
            defaultDate = d.toISOString().slice(0, 10);
          }
          input = `<input type="date" id="${escapeAttr(fieldId)}" data-field-id="${escapeAttr(field.id)}" ${requiredAttr} value="${defaultDate}">`;
          break;
        case 'time':
          input = `<input type="time" id="${escapeAttr(fieldId)}" data-field-id="${escapeAttr(field.id)}" ${requiredAttr}>`;
          break;
        default:
          input = `<input type="text" id="${escapeAttr(fieldId)}" data-field-id="${escapeAttr(field.id)}" ${requiredAttr} placeholder="${escapeAttr(field.placeholder || '')}">`;
      }
    }

    group.innerHTML = `
      <label for="${escapeAttr(fieldId)}" class="${requiredClass}">${escapeHtml(field.label)}</label>
      ${input}
    `;
  }

  return group;
}

// ── Collect all form values ─────────────────────────────
function collectFormData() {
  const data = {};
  document.querySelectorAll('#permit-form [data-field-id]').forEach(el => {
    const id = el.dataset.fieldId;
    if (el.type === 'checkbox') {
      data[id] = el.checked;
    } else {
      data[id] = el.value;
    }
  });
  return data;
}

// ── Trigger preview ─────────────────────────────────────
function previewPermit() {
  // Basic validation
  const form = document.getElementById('permit-form');
  const requiredFields = form.querySelectorAll('[required]');
  let valid = true;
  requiredFields.forEach(f => {
    if (!f.value || !f.value.trim()) {
      f.style.borderColor = 'var(--danger)';
      valid = false;
    } else {
      f.style.borderColor = '';
    }
  });

  if (!valid) {
    showToast('Please fill in all required fields', 'error');
    return;
  }


  // Store permit number for commit on actual print
  pendingPrintPermitNumber = currentGeneratedPermitNumber;
  pendingPrintTemplateId = currentTemplateId;

  // Set up log entry for filled permit
  setPermitPrintLog({
    permit_number: currentGeneratedPermitNumber,
    template_id: currentTemplateId,
    template_name: currentTemplate ? currentTemplate.name : '',
    type: 'filled',
    form_data: collectFormData()
  });

  const data = collectFormData();
  renderPermitPreview(currentTemplate, data);
  navigateTo('preview');
}
