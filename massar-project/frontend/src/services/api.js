const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request(endpoint, method, data = null) {
  const token = localStorage.getItem('massar_token');
  const headers = {
    'Content-Type': 'application/json',
  };

  // Automatically attach token if it exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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
    const result = await response.json();

    if (!response.ok) {
      const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/signup');
      if ((response.status === 401 || response.status === 403) && !isAuthEndpoint) {
        console.warn("Session expired or Unauthorized. Clearing stored token.");
        localStorage.removeItem('massar_token');
        localStorage.removeItem('massar_auth');
        // Do NOT hard-redirect here — let the app/component handle it
        return { ok: false, status: response.status, message: "Session expired. Please log in again." };
      }
      // Pass the backend error cleanly
      throw new Error(result.detail || result.message || "API request failed");
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
};
