import client from './client';

export const reportingApi = {
  getTaskAnalysis: async () => {
    const response = await client.get('/reporting/task-analysis/');
    return response.data;
  },
  getLeaderboard: async (period = 7) => {
    const response = await client.get('/reporting/leaderboard/', { params: { period } });
    return response.data;
  },
  getProjectHealth: async () => {
    const response = await client.get('/reporting/project-health/');
    return response.data;
  },
  getMyTasks: async () => {
    const response = await client.get('/reporting/my-tasks/');
    return response.data;
  }
};
