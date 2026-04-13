import client from './client';

export const milestoneApi = {
  getMilestones: async (projectId) => {
    const params = { project_id: projectId };
    const response = await client.get('/milestones/', { params });
    return response.data;
  },
  createMilestone: async (data) => {
    const response = await client.post('/milestones/', data);
    return response.data;
  },
  updateMilestone: async (id, data) => {
    const response = await client.patch(`/milestones/${id}/`, data);
    return response.data;
  },
  deleteMilestone: async (id) => {
    const response = await client.delete(`/milestones/${id}/`);
    return response.data;
  },
  reachMilestone: async (id) => {
    const response = await client.patch(`/milestones/${id}/reach/`);
    return response.data;
  },
  unreachMilestone: async (id) => {
    const response = await client.patch(`/milestones/${id}/unreach/`);
    return response.data;
  }
};
