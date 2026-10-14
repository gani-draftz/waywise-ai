// TravelReality AI - API Client Module

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health status');
    return res.json();
  },

  async getDestinations(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.step_free_only) query.append('step_free_only', 'true');
    if (params.max_walking_km) query.append('max_walking_km', params.max_walking_km);
    if (params.sort_by) query.append('sort_by', params.sort_by);

    const res = await fetch(`${API_BASE}/destinations?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch destinations');
    return res.json();
  },

  async getDestination(id) {
    const res = await fetch(`${API_BASE}/destinations/${id}`);
    if (!res.ok) throw new Error(`Destination ${id} not found`);
    return res.json();
  },

  async performRealityCheck(destId, profile = null, geminiApiKey = null) {
    const payload = {
      destination_id: destId,
      profile: profile,
      gemini_api_key: geminiApiKey || null
    };

    const res = await fetch(`${API_BASE}/reality-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Reality check failed' }));
      throw new Error(err.detail || 'Reality check failed');
    }
    return res.json();
  },

  async compareDestinations(destIds, profile = null) {
    const payload = {
      destination_ids: destIds,
      profile: profile
    };

    const res = await fetch(`${API_BASE}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Comparison failed' }));
      throw new Error(err.detail || 'Comparison failed');
    }
    return res.json();
  },

  async getWeather(destId, visitDate = null) {
    const query = visitDate ? `?visit_date=${encodeURIComponent(visitDate)}` : '';
    const res = await fetch(`${API_BASE}/weather/${destId}${query}`);
    if (!res.ok) throw new Error('Failed to retrieve weather conditions');
    return res.json();
  },

  async getReports(destId = null, status = 'all') {
    const query = new URLSearchParams();
    if (destId) query.append('destination_id', destId);
    if (status && status !== 'all') query.append('status', status);

    const res = await fetch(`${API_BASE}/reports?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch community reports');
    return res.json();
  },

  async submitReport(reportData) {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit report' }));
      throw new Error(err.detail || 'Failed to submit report');
    }
    return res.json();
  },

  async updateReportStatus(reportId, verificationStatus, adminNotes = '') {
    const res = await fetch(`${API_BASE}/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verification_status: verificationStatus,
        admin_notes: adminNotes
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update report status' }));
      throw new Error(err.detail || 'Failed to update status');
    }
    return res.json();
  }
};
