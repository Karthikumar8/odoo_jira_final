import client from './client';

export const timesheetApi = {
  getTimesheets: async (params) => {
    const response = await client.get('/timesheets/', { params });
    return response.data;
  },
  createTimesheet: async (data) => {
    const response = await client.post('/timesheets/', data);
    return response.data;
  },
  updateTimesheet: async (id, data) => {
    const response = await client.patch(`/timesheets/${id}/`, data);
    return response.data;
  },
  deleteTimesheet: async (id) => {
    const response = await client.delete(`/timesheets/${id}/`);
    return response.data;
  },
  getLeaderboard: async () => {
    const response = await client.get('/timesheets/leaderboard/');
    return response.data;
  }
};
