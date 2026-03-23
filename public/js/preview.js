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

function buildPermitHtml(template, data, isBlank) {
  let html = '';

  // Header
  html += `
    <div class="permit-header">
      <img src="/img/logo.png" alt="Company Logo" class="permit-logo">
      <h1>${escapeHtml(template.name)}</h1>
      <div class="permit-subtitle">Permit to Work – ${isBlank ? 'Blank Copy' : 'Issued Permit'}</div>
    </div>
  `;

  // Authoriser sections
  template.sections.forEach(section => {
    html += `<div class="permit-section"><h2>${escapeHtml(section.title)}</h2>`;

    // Group fields for 2-column layout where appropriate
    const fields = section.fields;
    let i = 0;
    while (i < fields.length) {
      const field = fields[i];
      const nextField = fields[i + 1];
      
      // Check if we should pair this field with the next one
      // Pair if: both are non-checkboxes and next field is suitable for pairing
      const shouldPair = shouldPairFields(field, nextField);
      
      if (field.type === 'checkbox') {
        const checked = !isBlank && data[field.id];
        html += `
          <div class="permit-checkbox-row">
            <span class="permit-checkbox ${checked ? 'checked' : ''}"></span>
            <span>${escapeHtml(field.label)}</span>
          </div>
        `;
        i++;
      } else if (shouldPair && nextField && nextField.type !== 'checkbox') {
        // Render two fields in a grid
        const value1 = (field.id === 'permit_number') 
          ? (data[field.id] || '')
          : (isBlank ? '' : (data[field.id] || ''));
        const value2 = (nextField.id === 'permit_number') 
          ? (data[nextField.id] || '')
          : (isBlank ? '' : (data[nextField.id] || ''));
          
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
        // Render single field
        const value = (field.id === 'permit_number') 
          ? (data[field.id] || '')
          : (isBlank ? '' : (data[field.id] || ''));
        html += `
          <div class="permit-field">
            <span class="permit-field-label">${escapeHtml(field.label)}:</span>
            <span class="permit-field-value ${isBlank && field.id !== 'permit_number' ? 'blank' : ''}">${escapeHtml(value)}</span>
          </div>
        `;
        i++;
      }
    }

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
