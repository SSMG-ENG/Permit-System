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

// Helper function to determine if two consecutive fields should be displayed side-by-side
function shouldPairFields(field, nextField) {
  if (!nextField || nextField.type === 'checkbox') return false;
  if (field.type === 'checkbox' || field.type === 'textarea') return false;
  
  // Pair fields with specific naming patterns:
  // - Date/Time fields (Date + Time)
  // - Date Issued + Valid From
  // - From + To pairs
  // - Location + Area
  // - Name + Position (for Personnel sections)
  
  const fieldLower = field.id.toLowerCase();
  const nextLower = nextField.id.toLowerCase();
  const labelLower = field.label.toLowerCase() + ' ' + nextField.label.toLowerCase();
  
  // Time fields pair with date fields
  if ((fieldLower.includes('date') || labelLower.includes('date issued')) && 
      (nextLower.includes('time') || nextLower.includes('valid from'))) {
    return true;
  }
  
  // "From" and "To" fields
  if ((fieldLower.includes('from') && nextLower.includes('to')) ||
      (fieldLower.includes('start') && nextLower.includes('end'))) {
    return true;
  }
  
  // Personnel: Name + Position
  if (labelLower.includes('name') && nextField.label.toLowerCase().includes('position')) {
    return true;
  }
  
  // Inspection time + Signature
  if (labelLower.includes('inspection') && nextLower.includes('signature')) {
    return true;
  }
  
  // Location + Area/Zone
  if (labelLower.includes('location') && labelLower.includes('area')) {
    return true;
  }
  
  // Generic: if both fields are short (date/time/text, not textarea) and not too long
  // Pair if labels are under 20 chars each
  if (field.label.length < 20 && nextField.label.length < 20 &&
      field.type !== 'textarea' && nextField.type !== 'textarea') {
    // Only pair if not already part of a specific pattern (avoid over-pairing)
    return false;
  }
  
  return false;
}

function buildSectionHtml(section, data, isBlank) {
  let html = `<div class="permit-section"><h2>${escapeHtml(section.title)}</h2>`;

  if (section.description) {
    html += `<div class="permit-section-description">${section.description}</div>`;
  }

  const fields = section.fields;
  let i = 0;
  // Track whether we're inside a checkbox grid
  let inCheckboxGrid = false;

  while (i < fields.length) {
    const field = fields[i];
    const nextField = fields[i + 1];

    if (field.type === 'checkbox') {
      // Open checkbox grid if not already open
      if (!inCheckboxGrid) {
        html += `<div class="permit-checkbox-grid">`;
        inCheckboxGrid = true;
      }
      const checked = !isBlank && data[field.id];
      html += `<div class="permit-checkbox-row"><span class="permit-checkbox ${checked ? 'checked' : ''}"></span><span>${escapeHtml(field.label)}</span></div>`;
      i++;
    } else {
      // Close checkbox grid if one was open
      if (inCheckboxGrid) {
        html += `</div>`;
        inCheckboxGrid = false;
      }

      const shouldPair = shouldPairFields(field, nextField);
      if (shouldPair && nextField && nextField.type !== 'checkbox') {
        const value1 = isBlank && field.id !== 'permit_number' ? '' : (data[field.id] || '');
        const value2 = isBlank && nextField.id !== 'permit_number' ? '' : (data[nextField.id] || '');
        html += `<div class="permit-fields-grid">
          <div class="permit-field permit-field-half">
            <span class="permit-field-label">${escapeHtml(field.label)}:</span>
            <span class="permit-field-value ${isBlank && field.id !== 'permit_number' ? 'blank' : ''}">${escapeHtml(value1)}</span>
          </div>
          <div class="permit-field permit-field-half">
            <span class="permit-field-label">${escapeHtml(nextField.label)}:</span>
            <span class="permit-field-value ${isBlank && nextField.id !== 'permit_number' ? 'blank' : ''}">${escapeHtml(value2)}</span>
          </div>
        </div>`;
        i += 2;
      } else {
        const value = isBlank && field.id !== 'permit_number' ? '' : (data[field.id] || '');
        html += `<div class="permit-field">
            <span class="permit-field-label">${escapeHtml(field.label)}:</span>
            <span class="permit-field-value ${isBlank && field.id !== 'permit_number' ? 'blank' : ''}">${escapeHtml(value)}</span>
          </div>`;
        // Show contractor ID directly below contractor company (filled permits only)
        if (!isBlank && field.id === 'contractor_company' && data && data.contractor_id) {
          html += `<div class="permit-field">
              <span class="permit-field-label">Contractor ID:</span>
              <span class="permit-field-value">${escapeHtml(data.contractor_id)}</span>
            </div>`;
        }
        i++;
      }
    }
  }

  if (inCheckboxGrid) html += `</div>`;
  html += '</div>';
  return html;
}

function buildPermitHtml(template, data, isBlank) {
  let html = '';

  // Header
  html += `
    <div class="permit-header">
      <img src="/img/logo.png" alt="Company Logo" class="permit-logo">
      <div><h1>${escapeHtml(template.name)}</h1></div>
    </div>
  `;

  // All authoriser sections in a 2-column grid
  html += `<div class="permit-body-columns">`;
  template.sections.forEach(section => {
    html += buildSectionHtml(section, data, isBlank);
  });
  html += `</div>`;

  // Handwritten sections in a row
  if (template.handwrittenSections && template.handwrittenSections.length > 0) {
    html += `<div class="permit-handwritten-row">`;
    template.handwrittenSections.forEach(section => {
      html += `<div class="permit-handwritten-section">`;
      html += `<h2>${escapeHtml(section.title)}</h2>`;
      if (section.description) {
        html += `<div class="permit-handwritten-description">${escapeHtml(section.description)}</div>`;
      }
      if (section.fields) {
        for (let i = 0; i < section.fields.length; i++) {
          const f = section.fields[i];

          if (f.inlineWithNext && section.fields[i + 1]) {
            const next = section.fields[i + 1];
            html += `<div class="permit-handwritten-field-pair">`;
            [f, next].forEach(pairField => {
              html += `<div class="permit-handwritten-field permit-handwritten-field-pair-item">`;
              html += `<div class="permit-handwritten-field-label">${escapeHtml(pairField.label)}:</div>`;
              const pairLines = pairField.lines || 1;
              for (let j = 0; j < pairLines; j++) {
                html += `<div class="permit-handwritten-line"></div>`;
              }
              html += `</div>`;
            });
            html += `</div>`;
            i++;
            continue;
          }

          html += `<div class="permit-handwritten-field">`;
          if (f.type === 'checkbox') {
            html += `<div class="permit-checkbox-row"><span class="permit-checkbox"></span><span>${escapeHtml(f.label)}</span></div>`;
          } else {
            html += `<div class="permit-handwritten-field-label">${escapeHtml(f.label)}:</div>`;
            const lines = f.lines || 1;
            for (let j = 0; j < lines; j++) {
              html += `<div class="permit-handwritten-line"></div>`;
            }
          }
          html += `</div>`;
        }
      }
      html += `</div>`;
    });
    html += `</div>`;
  }

  // Footer
  html += `
    <div class="permit-footer">
      This permit is only valid for the date, time, and location specified above.
      All conditions must be met before work commences. Retain this permit at the worksite.
    </div>
  `;

  return html;
}
