/**
 * API Client for NeuroBehavior-ASD Flask Backend.
 * Handles token storage, authentication headers, error handling,
 * and unified multimodal API calls.
 */

const BASE_URL = '/api';
const TOKEN_KEY = 'neurobehavior_auth_token';
const USER_KEY = 'neurobehavior_auth_user';

export const authStorage = {
  getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  },
  setToken(token, persist = false) {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      if (persist) localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  getUser() {
    try {
      const u = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser(user, persist = false) {
    if (user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      if (persist) localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },
  clear() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.headers || {};

  // Inject Bearer token if available
  const token = authStorage.getToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is an object and not FormData, stringify JSON
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || response.statusText || 'Request failed';
    // Auto logout on 401 if token was expired
    if (response.status === 401 && token) {
      authStorage.clear();
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }
  return data;
}

export const api = {
  // System Health
  async checkHealth() {
    return request('/health');
  },

  // Auth Endpoints
  async register(registrationData) {
    // Accepts object or positional arguments for backwards compatibility
    const payload = typeof registrationData === 'object'
      ? registrationData
      : { full_name: arguments[0], email: arguments[1], password: arguments[2], role: arguments[3] || 'patient' };

    const data = await request('/auth/register', {
      method: 'POST',
      body: payload,
    });
    if (data.token) {
      authStorage.setToken(data.token);
      authStorage.setUser(data.user);
    }
    return data;
  },

  async forgotPassword(email) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  async resetPassword(email, token, new_password) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: { email, token, new_password },
    });
  },

  async login(email, password, remember = false) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (data.token) {
      authStorage.setToken(data.token, remember);
      authStorage.setUser(data.user, remember);
    }
    return data;
  },

  async getCurrentUser() {
    return request('/auth/me');
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout notification error:', e.message);
    } finally {
      authStorage.clear();
    }
  },

  async getDemoUsers() {
    return request('/auth/demo-users');
  },

  // MRI Module
  async getMriStatus() {
    return request('/mri/status');
  },

  async uploadMriScan(formData) {
    return request('/mri/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async getMriHistory() {
    return request('/mri/history');
  },

  // Unified Assessment History
  async getUnifiedHistory(type = '') {
    const url = type ? `/assessments/history?type=${encodeURIComponent(type)}` : '/assessments/history';
    return request(url);
  },

  // Questionnaire Module (IASQ)
  async getQuestionnaireSchema() {
    return request('/questionnaire/schema');
  },

  async submitQuestionnaire(intakeData) {
    return request('/questionnaire/submit', {
      method: 'POST',
      body: intakeData,
    });
  },

  async getQuestionnaireHistory() {
    return request('/questionnaire/history');
  },

  // Support Centres Module (Leaflet / OSM)
  async getSupportCentres(params = {}) {
    let query = '';
    if (typeof params === 'string') {
      if (params) query = `?city=${encodeURIComponent(params)}`;
    } else if (params && typeof params === 'object') {
      const q = new URLSearchParams();
      if (params.city) q.append('city', params.city);
      if (params.lat != null) q.append('lat', params.lat);
      if (params.lng != null) q.append('lng', params.lng);
      if (params.radius_km != null) q.append('radius_km', params.radius_km);
      const str = q.toString();
      if (str) query = `?${str}`;
    }
    return request(`/centres${query}`);
  },

  // Reports Module
  async generateReport(payload) {
    return request('/reports/generate', {
      method: 'POST',
      body: payload,
    });
  },

  async listReports() {
    return request('/reports/list');
  },

  getReportDownloadUrl(filename) {
    const token = authStorage.getToken();
    return `/api/reports/download/${encodeURIComponent(filename)}?token=${encodeURIComponent(token || '')}`;
  },

  // Admin Dashboard
  async getAdminOverview() {
    return request('/admin/overview');
  },
};
