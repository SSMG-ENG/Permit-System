/* ── Main application controller ────────────────────────── */

let currentView = 'home';
let currentTemplateId = null;
let currentTemplate = null;
let adminUnlocked = false;
let approvedContractors = [];  // Loaded from Excel on startup
let contractorsLoadPromise = null;

// ── Permit number generation ────────────────────────────
const TEMPLATE_CODES = {
  'hot-work': 'HW',
  'confined-space': 'CS',
  'electrical-isolation': 'EI',
  'working-at-height': 'WH',
  'excavation': 'EX',
  'general-work': 'GW',
};

function getTemplateCode(templateId) {
  return TEMPLATE_CODES[templateId] || 'XX';
}

function getNextPermitNumberPreview(templateId) {
  // Returns what the next permit number WOULD be without saving it
  const code = getTemplateCode(templateId);
  const used = JSON.parse(localStorage.getItem('permit_numbers') || '{}');
  const templateUsed = used[templateId] || 0;
  const nextNum = String(templateUsed + 1).padStart(5, '0');
  return `${code}${nextNum}`;
}

function commitPermitNumber(templateId, permitNumber) {
  // Only call this when permit is actually being printed
  const code = getTemplateCode(templateId);
  const used = JSON.parse(localStorage.getItem('permit_numbers') || '{}');
  const templateUsed = used[templateId] || 0;
  used[templateId] = templateUsed + 1;
  localStorage.setItem('permit_numbers', JSON.stringify(used));
}

function loadApprovedContractors(force = false) {
  if (!force && contractorsLoadPromise) {
    return contractorsLoadPromise;
  }

  contractorsLoadPromise = API.getContractors()
    .then(contractors => {
      approvedContractors = Array.isArray(contractors) ? contractors : [];
      return approvedContractors;
    })
    .catch(() => {
      approvedContractors = [];
      return approvedContractors;
    })
    .finally(() => {
      contractorsLoadPromise = null;
    });

  return contractorsLoadPromise;
}

// ── Navigation ──────────────────────────────────────────
function navigateTo(view, data) {
  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');

  currentView = view;

  switch (view) {
    case 'home':
      document.getElementById('view-home').style.display = '';
      loadHome();
      break;
    case 'form':
      document.getElementById('view-form').style.display = '';
      if (data && data.templateId) {
        loadPermitForm(data.templateId);
      }
      break;
    case 'preview':
      document.getElementById('view-preview').style.display = '';
      break;
    case 'blank':
      document.getElementById('view-blank').style.display = '';
      if (data && data.templateId) {
        loadBlankPreview(data.templateId);
      }
      break;
    case 'admin':
      if (!adminUnlocked) {
        promptAdminPassword();
        return;
      }
      document.getElementById('view-admin').style.display = '';
      loadAdmin();
      break;
    case 'log':
      if (!adminUnlocked) {
        promptAdminPassword();
        return;
      }
      document.getElementById('view-log').style.display = '';
      loadPermitLog();
      break;
    case 'editor':
      if (!adminUnlocked) {
        promptAdminPassword();
        return;
      }
      document.getElementById('view-editor').style.display = '';
      if (data && data.templateId) {
        loadTemplateEditor(data.templateId);
      } else if (data && data.isNew) {
        loadNewTemplateEditor();
      }
      break;
  }

  window.scrollTo(0, 0);
}

// ── Global print state ──────────────────────────────────
let pendingPrintPermitNumber = null;
let pendingPrintTemplateId = null;

// Commit permit number before printing
window.addEventListener('beforeprint', () => {
  if (pendingPrintPermitNumber && pendingPrintTemplateId) {
    commitPermitNumber(pendingPrintTemplateId, pendingPrintPermitNumber);
    pendingPrintPermitNumber = null;
    pendingPrintTemplateId = null;
  }
});

// Log permit print to server
window.addEventListener('beforeprint', async () => {
  if (window.lastPermitPrintLog) {
    try {
      await fetch('/api/permit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window.lastPermitPrintLog)
      });
    } catch {}
    window.lastPermitPrintLog = null;
  }
});

// Helper to set up log for next print
function setPermitPrintLog({ permit_number, template_id, template_name, type, form_data }) {
  window.lastPermitPrintLog = {
    permit_number,
    template_id,
    template_name,
    type,
    form_data: form_data || null
  };
}

// ── Permit Log View ─────────────────────────────────────
async function loadPermitLog() {
  const area = document.getElementById('permit-log-table-area');
  area.innerHTML = '<p>Loading log...</p>';
  try {
    const res = await fetch('/api/permit-log?admin=1234');
    if (!res.ok) throw new Error('Failed to fetch log');
    const log = await res.json();
    if (!Array.isArray(log) || log.length === 0) {
      area.innerHTML = '<p>No permits have been printed yet.</p>';
      return;
    }
    let html = `<table class="permit-log-table"><thead><tr><th>Date/Time</th><th>Permit Number</th><th>Type</th><th>Template</th><th>Details</th></tr></thead><tbody>`;
    log.slice().reverse().forEach(entry => {
      html += `<tr>`;
      // Format timestamp to YYYY-MM-DD HH:MM (no seconds)
      let dt = '';
      if (entry.timestamp) {
        const d = new Date(entry.timestamp);
        if (!isNaN(d)) {
          const y = d.getFullYear();
          const m = String(d.getMonth()+1).padStart(2,'0');
          const day = String(d.getDate()).padStart(2,'0');
          const h = String(d.getHours()).padStart(2,'0');
          const min = String(d.getMinutes()).padStart(2,'0');
          dt = `${y}-${m}-${day} ${h}:${min}`;
        } else {
          dt = entry.timestamp;
        }
      }
      html += `<td>${escapeHtml(dt)}</td>`;
      html += `<td>${escapeHtml(entry.permit_number || '')}</td>`;
      html += `<td>${escapeHtml(entry.type || '')}</td>`;
      html += `<td>${escapeHtml(entry.template_name || entry.template_id || '')}</td>`;
      html += `<td>`;
      if (entry.type === 'filled' && entry.form_data) {
        const formattedHtml = formatJsonForDisplay(entry.form_data);
        html += `<button class="btn btn-sm btn-outline" onclick="showPermitLogDetails(this)">View Details</button>`;
        html += `<div class="permit-log-details" style="display:none;">${formattedHtml}</div>`;
      } else {
        html += '-';
      }
      html += `</td></tr>`;
    });
    html += '</tbody></table>';
    area.innerHTML = html;
  } catch (e) {
    area.innerHTML = `<p style="color:var(--danger)">Error loading log: ${escapeHtml(e.message)}</p>`;
  }
}

function showPermitLogDetails(btn) {
  const details = btn.parentNode.querySelector('.permit-log-details');
  if (details) {
    details.style.display = details.style.display === 'none' ? '' : 'none';
  }
}

// ── Home page ───────────────────────────────────────────
async function loadHome() {
  const grid = document.getElementById('permit-grid');
  grid.innerHTML = '<p>Loading templates...</p>';

  try {
    const templates = await API.getTemplates();
    if (templates.length === 0) {
      grid.innerHTML = '<p>No permit templates found. <a href="#" onclick="navigateTo(\'admin\')">Create one</a> to get started.</p>';
      return;
    }

    grid.innerHTML = templates.map(t => `
      <div class="permit-card">
        <div class="permit-card-colour" style="background:var(--accent)"></div>
        <div class="permit-card-body">
          <h3>${escapeHtml(t.name)}</h3>
          <p>${escapeHtml(t.description || '')}</p>
        </div>
        <div class="permit-card-actions">
          <button class="btn btn-primary btn-sm" onclick="navigateTo('form', {templateId:'${escapeAttr(t.id)}'})">Fill In Permit</button>
          <button class="btn btn-outline btn-sm" onclick="navigateTo('blank', {templateId:'${escapeAttr(t.id)}'})">Print Blank</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    grid.innerHTML = `<p style="color:var(--danger)">Error loading templates: ${escapeHtml(e.message)}</p>`;
  }
}

// ── Toast notifications ─────────────────────────────────
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Clickable field type picker ─────────────────────────
function chooseFieldTypeDialog() {
  return new Promise(resolve => {
    const existing = document.querySelector('.field-type-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'field-type-modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'field-type-modal';
    dialog.innerHTML = `
      <h3>Select Field Type</h3>
      <p>Choose what to add to this section:</p>
      <div class="field-type-modal-actions">
        <button type="button" class="btn btn-primary" data-choice="checkbox">Tickbox</button>
        <button type="button" class="btn btn-secondary" data-choice="line">Empty Line</button>
      </div>
      <button type="button" class="btn btn-outline btn-sm field-type-cancel">Cancel</button>
    `;

    const finish = choice => {
      backdrop.remove();
      resolve(choice);
    };

    dialog.querySelectorAll('[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => finish(btn.dataset.choice));
    });

    dialog.querySelector('.field-type-cancel').addEventListener('click', () => finish(null));

    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) finish(null);
    });

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatJsonForDisplay(obj) {
  // Convert object to human-readable key-value pairs
  const items = [];
  
  const addItems = (data, prefix = '') => {
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      // Convert key to readable format (camelCase/snake_case to Title Case)
      const readableKey = key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Skip nested objects, or if you want to show them, recurse
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
        if (value.length > 0) {
          items.push({ label: readableKey, value: value.join(', ') });
        }
      } else if (value !== '') {
        items.push({ label: readableKey, value: String(value) });
      }
    });
  };
  
  addItems(obj);
  
  if (items.length === 0) {
    return '<p style="color:#999;font-style:italic;">No data recorded</p>';
  }
  
  let html = '<dl style="display:grid;grid-template-columns:auto 1fr;gap:0.5rem 1rem;align-items:start;">';
  items.forEach(item => {
    html += `<dt style="font-weight:600;color:#2c3e50;">${escapeHtml(item.label)}:</dt>`;
    html += `<dd style="margin:0;color:#555;">${escapeHtml(item.value)}</dd>`;
  });
  html += '</dl>';
  
  return html;
}

function escapeAttr(str) {
  return String(str).replace(/[&"'<>]/g, c => ({
    '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;'
  }[c]));
}

// ── Admin password protection ───────────────────────────
function resetPermitNumbers() {
  localStorage.removeItem('permit_numbers');
  currentGeneratedPermitNumber = null;
  showToast('Permit numbers reset; next permit starts at 1', 'success');
}

function promptAdminPassword() {
  const backdrop = document.createElement('div');
  backdrop.className = 'field-type-modal-backdrop';
  
  const dialog = document.createElement('div');
  dialog.className = 'field-type-modal';
  dialog.innerHTML = `
    <h3>Admin Access</h3>
    <p>Enter password to access template management:</p>
    <input type="password" id="admin-password" placeholder="Password" style="width:100%;padding:0.6rem;border:1.5px solid var(--border);border-radius:6px;font-size:0.9rem;margin-bottom:1rem;margin-top:0.5rem;">
    <div class="field-type-modal-actions">
      <button type="button" class="btn btn-primary" onclick="attemptAdminUnlock()">Unlock</button>
      <button type="button" class="btn btn-secondary" onclick="document.querySelector('.field-type-modal-backdrop').remove();navigateTo('home')">Cancel</button>
    </div>
  `;
  
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  document.getElementById('admin-password').focus();
  document.getElementById('admin-password').addEventListener('keypress', e => {
    if (e.key === 'Enter') attemptAdminUnlock();
  });
}

function attemptAdminUnlock() {
  const pwd = document.getElementById('admin-password').value;
  if (pwd === '1234') {
    adminUnlocked = true;
    document.querySelector('.field-type-modal-backdrop').remove();
    navigateTo(currentView === 'home' ? 'admin' : currentView);
  } else {
    showToast('Incorrect password', 'error');
    document.getElementById('admin-password').value = '';
  }
}

// ── Initialise ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  navigateTo('home');
  loadApprovedContractors();
});
