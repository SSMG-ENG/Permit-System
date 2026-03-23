/* ── API helper module ──────────────────────────────────── */
const API = {
  async getTemplates() {
    const res = await fetch('/api/templates');
    if (!res.ok) throw new Error('Failed to load templates');
    return res.json();
  },

  async getTemplate(id) {
    const res = await fetch(`/api/templates/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Template not found');
    return res.json();
  },

  async createTemplate(template) {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create template');
    }
    return res.json();
  },

  async updateTemplate(id, template) {
    const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!res.ok) throw new Error('Failed to update template');
    return res.json();
  },

  async deleteTemplate(id) {
    const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete template');
    return res.json();
  },
};
