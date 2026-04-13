import client from './client';

export const taskApi = {
  getTasks: async (projectId, stageId) => {
    const params = { project_id: projectId };
    if (stageId) params.stage_id = stageId;
    const response = await client.get('/tasks/', { params });
    return response.data;
  },
  getTaskDetail: async (taskId) => {
    const response = await client.get(`/tasks/${taskId}/`);
    return response.data;
  },
  createTask: async (data) => {
    const response = await client.post('/tasks/', data);
    return response.data;
  },
  updateTask: async (id, data) => {
    const response = await client.patch(`/tasks/${id}/`, data);
    return response.data;
  },
  archiveTask: async (id) => {
    const response = await client.delete(`/tasks/${id}/`);
    return response.data;
  },
  moveTask: async (id, stageId, sequence) => {
    const payload = { stage_id: stageId };
    if (sequence !== undefined) payload.sequence = sequence;
    const response = await client.patch(`/tasks/${id}/move/`, payload);
    return response.data;
  },
  getMetadata: async () => {
    const response = await client.get('/tasks/metadata/all/');
    return response.data;
  }
};
