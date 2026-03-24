const express = require('express');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

let contractorsCache = {
  filePath: '',
  mtimeMs: 0,
  contractors: []
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure required directories exist
[TEMPLATES_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Settings helpers ────────────────────────────────────────

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')); }
  catch { return {}; }
}

function writeSettings(data) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function readContractorsFromWorkbook(filePath) {
  const stat = fs.statSync(filePath);
  if (
    contractorsCache.filePath === filePath &&
    contractorsCache.mtimeMs === stat.mtimeMs
  ) {
    return contractorsCache.contractors;
  }

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false
  });

  if (!rows || rows.length < 3) {
    contractorsCache = { filePath, mtimeMs: stat.mtimeMs, contractors: [] };
    return [];
  }

  // Headers are in row 2 (index 1), data starts from row 3 (index 2)
  const headers = rows[1].map(h => String(h || '').toLowerCase().trim());
  const idCol = headers.findIndex(h =>
    (h.includes('contractor') && h.includes('id')) || h === 'contractors id'
  );
  const nameCol = headers.findIndex(h =>
    h.includes('company') || (h.includes('contractor') && h.includes('name'))
  );

  if (idCol === -1) {
    throw new Error('Could not find a "Contractors ID" column in the file');
  }
  if (nameCol === -1) {
    throw new Error('Could not find a "Company Name" column in the file');
  }

  const contractors = rows.slice(2)
    .filter(row => row[idCol] !== '' && row[nameCol] !== '')
    .map(row => ({
      id: String(row[idCol]).trim(),
      name: String(row[nameCol]).trim()
    }))
    .filter(c => c.id && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  contractorsCache = { filePath, mtimeMs: stat.mtimeMs, contractors };
  return contractors;
}

// ── Template API ────────────────────────────────────────────

// List all templates (summary only)
app.get('/api/templates', (req, res) => {
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
  const templates = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8'));
    return { id: data.id, name: data.name, description: data.description };
  });
  res.json(templates);
});

// Get a single template by ID
app.get('/api/templates/:id', (req, res) => {
  const id = sanitizeId(req.params.id);
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Template not found' });
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  res.json(data);
});

// Create a new template
app.post('/api/templates', (req, res) => {
  const template = req.body;
  if (!template.id || !template.name) {
    return res.status(400).json({ error: 'Template must have an id and name' });
  }
  template.id = sanitizeId(template.id);
  const filePath = path.join(TEMPLATES_DIR, `${template.id}.json`);
  if (fs.existsSync(filePath)) {
    return res.status(409).json({ error: 'Template with this ID already exists' });
  }
  fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');
  res.status(201).json(template);
});

// Update an existing template
app.put('/api/templates/:id', (req, res) => {
  const id = sanitizeId(req.params.id);
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Template not found' });
  const template = req.body;
  template.id = id;
  fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf8');
  res.json(template);
});

// Delete a template
app.delete('/api/templates/:id', (req, res) => {
  const id = sanitizeId(req.params.id);
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Template not found' });
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

// ── Helpers ─────────────────────────────────────────────────

function sanitizeId(id) {
  // Only allow alphanumeric, hyphens, underscores
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
}

// ── Permit Print Log API ───────────────────────────────────
const LOG_FILE = path.join(__dirname, 'logs', 'permit-log.jsonl');

// Append a log entry (called when a permit is printed)
app.post('/api/permit-log', (req, res) => {
  const entry = req.body;
  entry.timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to write log' });
  }
});

// Get all log entries (admin only, simple password check)
app.get('/api/permit-log', (req, res) => {
  // For demo: require ?admin=1234
  if (req.query.admin !== '1234') return res.status(403).json({ error: 'Forbidden' });
  try {
    if (!fs.existsSync(LOG_FILE)) return res.json([]);
    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(line => line.trim().length > 0);
    const entries = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read log' });
  }
});

// ── Settings API ───────────────────────────────────────────

// Get current settings (file path is returned so admin can see it; no secrets here)
app.get('/api/settings', (req, res) => {
  res.json(readSettings());
});

// Save settings (admin password required)
app.put('/api/settings', (req, res) => {
  if (req.query.admin !== '1234') return res.status(403).json({ error: 'Forbidden' });
  const { contractorsFile } = req.body;
  if (contractorsFile !== undefined && typeof contractorsFile !== 'string') {
    return res.status(400).json({ error: 'contractorsFile must be a string' });
  }
  const settings = readSettings();
  settings.contractorsFile = (contractorsFile || '').trim();
  try {
    writeSettings(settings);
    contractorsCache = { filePath: '', mtimeMs: 0, contractors: [] };
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ── Contractors API ─────────────────────────────────────────

app.get('/api/contractors', (req, res) => {
  const settings = readSettings();
  if (!settings.contractorsFile) return res.json([]);

  const filePath = settings.contractorsFile;

  // Validate extension
  const ext = path.extname(filePath).toLowerCase();
  if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
    return res.status(400).json({ error: 'File must be .xlsx, .xls, or .csv' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Contractors file not found at: ' + filePath });
  }

  try {
    const contractors = readContractorsFromWorkbook(filePath);
    res.json(contractors);
  } catch (err) {
    const status = /Could not find/.test(err.message) ? 400 : 500;
    res.status(status).json({ error: 'Failed to read contractors file: ' + err.message });
  }
});

// ── SPA fallback – serve index.html for client-side routes ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Permit System running at http://localhost:${PORT}`);
});
