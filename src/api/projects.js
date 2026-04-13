import client from './client';

export const projectApi = {
  getProjects: async () => {
    const response = await client.get('/projects/');
    return response.data;
  },
  getProject: async (id) => {
    const response = await client.get(`/projects/${id}/`);
    return response.data;
  },
  createProject: async (data) => {
    const response = await client.post('/projects/', data);
    return response.data;
  },
  updateProject: async (id, data) => {
    const response = await client.patch(`/projects/${id}/`, data);
    return response.data;
  },
  deleteProject: async (id) => {
    const response = await client.delete(`/projects/${id}/`);
    return response.data;
  },
  getDashboardStats: async () => {
    const response = await client.get('/projects/dashboard_stats/');
    return response.data;
  }
};
