import client from './client';
export const updatesApi = {
  getUpdates: async (projectId) => {
    const response = await client.get('/updates/', { params: { project_id: projectId } });
    return response.data;
  },
  createUpdate: async (data) => {
    const response = await client.post('/updates/', data);
    return response.data;
  }
};
