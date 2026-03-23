const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TEMPLATES_DIR = path.join(__dirname, 'templates');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure templates directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
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

// ── SPA fallback – serve index.html for client-side routes ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Permit System running at http://localhost:${PORT}`);
});
