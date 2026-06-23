import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('verifid_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      localStorage.removeItem('verifid_token');
      localStorage.removeItem('verifid_email');
      window.dispatchEvent(new CustomEvent('verifid:session-expired'));
    }

    if (status === 429) {
      console.warn('[VerifID] Rate limit alcanzado. Espera un momento.');
    }

    return Promise.reject(error);
  }
);

export const authService = {
  register: (email, password, gdpr_consent) =>
    api.post('/auth/register', { email, password, gdpr_consent }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  resetPassword: (email, newPassword) =>
    api.post('/auth/reset-password', { email, newPassword }),
};

export const verifyService = {
  start: (userData) =>
    api.post('/verify/start', userData),

  uploadDocument: (verificationId, file, side, docType) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('side', side);
    formData.append('docType', docType);
    return api.post(`/verify/${verificationId}/document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutos — OCR con Sharp puede tardar 30-40s en móvil
    });
  },

  getStatus: (verificationId) =>
    api.get(`/verify/${verificationId}/status`),

  getResult: (verificationId) =>
    api.get(`/verify/${verificationId}/result`),

  downloadReport: async (verificationId) => {
    const response = await api.get(`/verify/${verificationId}/report`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `VerifID_${verificationId.slice(0, 8)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default api;