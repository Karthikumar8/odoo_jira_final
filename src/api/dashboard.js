import client from './client';
export const dashboardApi = {
  getOverview: async () => {
    const response = await client.get('/projects/dashboard/');
    return response.data;
  }
};
