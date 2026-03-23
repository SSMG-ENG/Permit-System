/* ── Permit preview / print renderer ───────────────────── */

function renderPermitPreview(template, data) {
  const container = document.getElementById('permit-preview');
  container.innerHTML = buildPermitHtml(template, data, false);
}

async function loadBlankPreview(templateId) {
  try {
    const template = await API.getTemplate(templateId);
    // Generate blank permit number preview (not saved until printed)
    const blankPermitNumber = getNextPermitNumberPreview(templateId);
    const blankData = { permit_number: blankPermitNumber };
    

    // Store for commit when user prints
    pendingPrintPermitNumber = blankPermitNumber;
    pendingPrintTemplateId = templateId;

    // Set up log entry for blank permit
    setPermitPrintLog({
      permit_number: blankPermitNumber,
      template_id: templateId,
      template_name: template ? template.name : '',
      type: 'blank',
      form_data: null
    });
    
    const container = document.getElementById('blank-preview');
    container.innerHTML = buildPermitHtml(template, blankData, true);
  } catch (e) {
    showToast('Failed to load template', 'error');
    navigateTo('home');
  }
}

function buildPermitHtml(template, data, isBlank) {
  let html = '';

  // Header
  html += `
    <div class="permit-header">
      <img src="/img/logo.png" alt="Scottish Shellfish" class="permit-logo">
      <div class="company-name">Scottish Shellfish</div>
      <h1>${escapeHtml(template.name)}</h1>
      <div class="permit-subtitle">Permit to Work – ${isBlank ? 'Blank Copy' : 'Issued Permit'}</div>
    </div>
  `;

  // Authoriser sections
  template.sections.forEach(section => {
    html += `<div class="permit-section"><h2>${escapeHtml(section.title)}</h2>`;

    section.fields.forEach(field => {
      if (field.type === 'checkbox') {
        const checked = !isBlank && data[field.id];
        html += `
          <div class="permit-checkbox-row">
            <span class="permit-checkbox ${checked ? 'checked' : ''}"></span>
            <span>${escapeHtml(field.label)}</span>
          </div>
        `;
      } else {
        // Permit number should always display, even on blanks
        const value = (field.id === 'permit_number') 
          ? (data[field.id] || '')
          : (isBlank ? '' : (data[field.id] || ''));
        html += `
          <div class="permit-field">
            <span class="permit-field-label">${escapeHtml(field.label)}:</span>
            <span class="permit-field-value ${isBlank && field.id !== 'permit_number' ? 'blank' : ''}">${escapeHtml(value)}</span>
          </div>
        `;
      }
    });

    html += '</div>';
  });

  // Handwritten sections
  if (template.handwrittenSections && template.handwrittenSections.length > 0) {
    template.handwrittenSections.forEach(section => {
      html += `<div class="permit-handwritten-section">`;
      html += `<h2>${escapeHtml(section.title)}</h2>`;

      if (section.description) {
        html += `<div class="permit-handwritten-description">${escapeHtml(section.description)}</div>`;
      }

      if (section.fields) {
        section.fields.forEach(f => {
          const isCheckbox = f.type === 'checkbox';
          html += `<div class="permit-handwritten-field">`;
          if (isCheckbox) {
            html += `
              <div class="permit-checkbox-row">
                <span class="permit-checkbox"></span>
                <span>${escapeHtml(f.label)}</span>
              </div>
            `;
          } else {
            html += `<div class="permit-handwritten-field-label">${escapeHtml(f.label)}:</div>`;
            const lines = f.lines || 1;
            for (let i = 0; i < lines; i++) {
              html += `<div class="permit-handwritten-line"></div>`;
            }
          }
          html += '</div>';
        });
      }

      html += '</div>';
    });
  }

  // Footer
  html += `
    <div class="permit-footer">
      This permit is only valid for the date, time, and location specified above.<br>
      All conditions must be met before work commences. Retain this permit at the worksite.
    </div>
  `;

  return html;
}
