import api from './api';

export const verifyBiometric = (payload) => api.post('/biometrics/verify', payload);

export default { verifyBiometric };
