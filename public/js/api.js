/* ── API helper module ──────────────────────────────────── */
const API = {
  getAdminToken() {
    return sessionStorage.getItem('admin_token') || '';
  },

  adminHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAdminToken()}`
    };
  },

  async login(password) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const { token } = await res.json();
    sessionStorage.setItem('admin_token', token);
    return token;
  },

  logout() {
    const token = this.getAdminToken();
    sessionStorage.removeItem('admin_token');
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
  },

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
      headers: this.adminHeaders(),
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
      headers: this.adminHeaders(),
      body: JSON.stringify(template),
    });
    if (!res.ok) throw new Error('Failed to update template');
    return res.json();
  },

  async deleteTemplate(id) {
    const res = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.getAdminToken()}` },
    });
    if (!res.ok) throw new Error('Failed to delete template');
    return res.json();
  },

  async getSettings() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load settings');
    return res.json();
  },

  async saveSettings(data) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: this.adminHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save settings');
    }
    return res.json();
  },

  async getContractors() {
    const res = await fetch('/api/contractors');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load contractors');
    }
    return res.json();
  },
};
