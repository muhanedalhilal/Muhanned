const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request(endpoint, method, data = null) {
  const token = localStorage.getItem('massar_token');
  const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/signup');
  const headers = {
    'Content-Type': 'application/json',
  };

  // Automatically attach token if it exists
  if (token && !isAuthEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach language preference
  const lang = localStorage.getItem('massar_lang') || 'en';
  headers['Accept-Language'] = lang;

  const config = {
    method,
    headers,
  };

  if (data) {
    if (data instanceof FormData) {
      // Let the browser automatically set the correct boundary for multipart requests
      delete config.headers['Content-Type'];
      config.body = data;
    } else {
      config.body = JSON.stringify(data);
    }
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    let result = {};
    if (rawText) {
      if (contentType.includes('application/json')) {
        try {
          result = JSON.parse(rawText);
        } catch {
          result = { detail: rawText };
        }
      } else {
        result = { detail: rawText };
      }
    }

    if (!response.ok) {
      if (response.status === 401 && !isAuthEndpoint) {
        console.warn("Session expired or Unauthorized. Clearing stored token.");
        localStorage.removeItem('massar_token');
        localStorage.removeItem('massar_auth');
        // Do NOT hard-redirect here — let the app/component handle it
        return { ok: false, status: response.status, message: "Session expired. Please log in again." };
      }
      // Pass the backend error cleanly without throwing, so callers can check ok + status
      return { ok: false, status: response.status, message: result.detail || result.message || "API request failed" };
    }

    return { ok: true, data: result };
  } catch (error) {
    console.error("API Request Error:", error);
    return { ok: false, message: error.message };
  }
}

export const api = {
  get: (endpoint) => request(endpoint, 'GET'),
  post: (endpoint, data) => request(endpoint, 'POST', data),
  put: (endpoint, data) => request(endpoint, 'PUT', data),
  delete: (endpoint) => request(endpoint, 'DELETE'),
  wsUrl: (endpoint) => {
    const token = encodeURIComponent(localStorage.getItem('massar_token') || '');
    const base = API_URL.replace(/^http/, 'ws');
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${base}${endpoint}${separator}token=${token}`;
  },
};

export async function openResource(resource) {
  const docId = resource?.documentId || resource?.id;
  const popup = window.open('about:blank', '_blank');

  try {
    let url = null;
    if (docId) {
      const groupQuery = resource?.groupId ? `?group_id=${encodeURIComponent(resource.groupId)}` : '';
      const res = await api.get(`/knowledge/documents/${docId}/link${groupQuery}`);
      if (res.ok) url = res.data.fileUrl;
    }

    if (!url && !docId && resource?.fileUrl && !resource.fileUrl.includes('/storage/v1/object/public/documents/')) {
      url = resource.fileUrl;
    }

    if (url) {
      if (popup) {
        popup.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (popup) popup.close();
    alert('Resource content is not available yet.');
  } catch (error) {
    if (popup) popup.close();
    alert(error.message || 'Could not open resource.');
  }
}
