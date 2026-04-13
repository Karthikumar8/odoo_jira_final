import client from './client';

export const stageApi = {
  getStages: async (projectId) => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await client.get('/stages/', { params });
    return response.data;
  },
  createStage: async (data) => {
    const response = await client.post('/stages/', data);
    return response.data;
  },
  updateStage: async (id, data) => {
    const response = await client.patch(`/stages/${id}/`, data);
    return response.data;
  },
  deleteStage: async (id) => {
    const response = await client.delete(`/stages/${id}/`);
    return response.data;
  },
  reorderStages: async (orderedStages) => {
    const response = await client.patch('/stages/reorder/', { stages: orderedStages });
    return response.data;
  }
};
