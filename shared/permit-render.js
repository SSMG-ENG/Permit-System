/* ── Shared permit HTML renderer (Node.js + browser compatible) ── */

// In Node.js, this is a module. In browser, functions are globals.
(function root() {
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const PERMIT_FOOTER = 'This permit is only valid for the date, time, and location specified above. All conditions must be met before work commences. Retain this permit at the worksite.';

  function shouldPairFields(field, nextField) {
    if (!nextField || nextField.type === 'checkbox') return false;
    if (field.type === 'checkbox' || field.type === 'textarea') return false;

    const fieldLower = field.id.toLowerCase();
    const nextLower = nextField.id.toLowerCase();
    const labelLower = field.label.toLowerCase() + ' ' + nextField.label.toLowerCase();

    if ((fieldLower.includes('date') || labelLower.includes('date issued')) &&
        (nextLower.includes('time') || nextLower.includes('valid from'))) {
      return true;
    }
    if ((fieldLower.includes('from') && nextLower.includes('to')) ||
        (fieldLower.includes('start') && nextLower.includes('end'))) {
      return true;
    }
    if (field.label.toLowerCase().includes('name') && nextField.label.toLowerCase().includes('position')) {
      return true;
    }
    return false;
  }

  function buildSectionHtml(section, data, isBlank) {
    let html = `<div class="permit-section"><h2>${escapeHtml(section.title)}</h2>`;
    if (section.description) {
      html += `<div class="permit-section-description">${section.description}</div>`;
    }

    const fields = section.fields;
    let i = 0, inCheckboxGrid = false;

    while (i < fields.length) {
      const field = fields[i];
      const nextField = fields[i + 1];

      if (field.type === 'checkbox') {
        if (!inCheckboxGrid) { html += '<div class="permit-checkbox-grid">'; inCheckboxGrid = true; }
        const checked = !isBlank && data[field.id];
        html += `<div class="permit-checkbox-row"><span class="permit-checkbox ${checked ? 'checked' : ''}"></span><span>${escapeHtml(field.label)}</span></div>`;
        i++;
      } else {
        if (inCheckboxGrid) { html += '</div>'; inCheckboxGrid = false; }

        const shouldPair = shouldPairFields(field, nextField);
        if (shouldPair && nextField && nextField.type !== 'checkbox') {
          const value1 = isBlank && field.id !== 'permit_number' ? '' : (data[field.id] || '');
          const value2 = isBlank && nextField.id !== 'permit_number' ? '' : (data[nextField.id] || '');
          const hl1 = field.highlight ? ' highlight' : '';
          const hl2 = nextField.highlight ? ' highlight' : '';
          html += `<div class="permit-fields-grid">
            <div class="permit-field permit-field-half">
              <span class="permit-field-label${hl1}">${escapeHtml(field.label)}:</span>
              <span class="permit-field-value${isBlank && field.id !== 'permit_number' ? ' blank' : ''}">${escapeHtml(value1)}</span>
            </div>
            <div class="permit-field permit-field-half">
              <span class="permit-field-label${hl2}">${escapeHtml(nextField.label)}:</span>
              <span class="permit-field-value${isBlank && nextField.id !== 'permit_number' ? ' blank' : ''}">${escapeHtml(value2)}</span>
            </div>
          </div>`;
          i += 2;
        } else {
          const value = isBlank && field.id !== 'permit_number' ? '' : (data[field.id] || '');
          const hc = field.highlight ? ' highlight' : '';
          html += `<div class="permit-field">
            <span class="permit-field-label${hc}">${escapeHtml(field.label)}:</span>
            <span class="permit-field-value${isBlank && field.id !== 'permit_number' ? ' blank' : ''}">${escapeHtml(value)}</span>
          </div>`;
          if (!isBlank && field.id === 'contractor_company' && data && data.contractor_id) {
            html += `<div class="permit-field"><span class="permit-field-label">Contractor ID:</span><span class="permit-field-value">${escapeHtml(data.contractor_id)}</span></div>`;
          }
          i++;
        }
      }
    }

    if (inCheckboxGrid) html += '</div>';
    html += '</div>';
    return html;
  }

  function buildPermitHtml(template, data, isBlank) {
    let html = `<div class="permit-header">
      <img src="/img/logo.png" alt="Company Logo" class="permit-logo">
      <div><h1>${escapeHtml(template.name)}</h1></div>
    </div>`;

    html += '<div class="permit-body-columns">';
    template.sections.forEach(section => {
      html += buildSectionHtml(section, data, isBlank);
    });
    html += '</div>';

    if (template.handwrittenSections && template.handwrittenSections.length > 0) {
      html += '<div class="permit-handwritten-row">';
      template.handwrittenSections.forEach(section => {
        html += `<div class="permit-handwritten-section"><h2>${escapeHtml(section.title)}</h2>`;
        if (section.description) html += `<div class="permit-handwritten-description">${escapeHtml(section.description)}</div>`;
        if (section.fields) {
          for (let i = 0; i < section.fields.length; i++) {
            const f = section.fields[i];
            if (f.inlineWithNext && section.fields[i + 1]) {
              const next = section.fields[i + 1];
              html += '<div class="permit-handwritten-field-pair">';
              [f, next].forEach(pairField => {
                html += '<div class="permit-handwritten-field permit-handwritten-field-pair-item">';
                html += `<div class="permit-handwritten-field-label">${escapeHtml(pairField.label)}:</div>`;
                for (let j = 0; j < (pairField.lines || 1); j++) html += '<div class="permit-handwritten-line"></div>';
                html += '</div>';
              });
              html += '</div>';
              i++;
              continue;
            }
            html += '<div class="permit-handwritten-field">';
            if (f.type === 'checkbox') {
              html += `<div class="permit-checkbox-row"><span class="permit-checkbox"></span><span>${escapeHtml(f.label)}</span></div>`;
            } else {
              const hc = f.highlight ? ' highlight' : '';
              html += `<div class="permit-handwritten-field-label${hc}">${escapeHtml(f.label)}:</div>`;
              for (let j = 0; j < (f.lines || 1); j++) html += '<div class="permit-handwritten-line"></div>';
            }
            html += '</div>';
          }
        }
        html += '</div>';
      });
      html += '</div>';
    }

    html += `<div class="permit-footer">${PERMIT_FOOTER}</div>`;
    return html;
  }

  // Export for Node.js, define globals for browser
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildPermitHtml, buildSectionHtml, shouldPairFields, escapeHtml, PERMIT_FOOTER };
  } else {
    window.SharedPermit = { buildPermitHtml, buildSectionHtml, shouldPairFields, escapeHtml, PERMIT_FOOTER };
  }
})();
