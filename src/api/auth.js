import client from './client';

export const authApi = {
  login: async (credentials) => {
    const response = await client.post('/auth/login/', credentials);
    return response.data;
  },
  logout: async (refreshToken) => {
    const response = await client.post('/auth/logout/', { refresh: refreshToken });
    return response.data;
  },
  getMe: async () => {
    const response = await client.get('/auth/me/');
    return response.data;
  }
};
