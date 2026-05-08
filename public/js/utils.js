/* ── Shared utilities (browser + Node.js compatible) ──── */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return String(str).replace(/[&"'<>]/g, c => ({
    '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;'
  }[c]));
}

function formatJsonForDisplay(obj) {
  const items = [];

  const addItems = (data) => {
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      const readableKey = key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '') {
            const subKey = k
              .replace(/_/g, ' ')
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            items.push({ label: subKey, value: String(v) });
          }
        });
      } else if (Array.isArray(value)) {
        if (value.length > 0) items.push({ label: readableKey, value: value.join(', ') });
      } else if (value !== '') {
        items.push({ label: readableKey, value: String(value) });
      }
    });
  };

  addItems(obj);

  if (items.length === 0) return '<p style="color:#999;font-style:italic;">No data recorded</p>';

  let html = '<dl style="display:grid;grid-template-columns:auto 1fr;gap:0.5rem 1rem;align-items:start;">';
  items.forEach(item => {
    html += `<dt style="font-weight:600;color:#2c3e50;">${escapeHtml(item.label)}:</dt>`;
    html += `<dd style="margin:0;color:#555;">${escapeHtml(item.value)}</dd>`;
  });
  html += '</dl>';
  return html;
}

// ── Shared constants ─────────────────────────────────────
const TEMPLATE_CODES = {
  'hot-work': 'HW',
  'confined-space': 'CS',
  'electrical-isolation': 'EI',
  'working-at-height': 'WH',
  'excavation': 'EX',
  'general-work': 'GW',
};

const PERMIT_FOOTER = 'This permit is only valid for the date, time, and location specified above. All conditions must be met before work commences. Retain this permit at the worksite.';
