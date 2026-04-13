import client from './client';

export const activityApi = {
  getActivities: async (resModel, resId) => {
    if (!resId && resModel) { resId = resModel; resModel = 'project.task'; }
    const response = await client.get('/activities/', { params: { res_model: resModel, res_id: resId } });
    return response.data;
  },
  getMetadata: async () => {
    const response = await client.get('/activities/metadata/');
    return response.data;
  },
  createActivity: async (data) => {
    const response = await client.post('/activities/', data);
    return response.data;
  },
  markDone: async (id) => {
    const response = await client.post(`/activities/${id}/done/`);
    return response.data;
  },
  cancelActivity: async (id) => {
    const response = await client.delete(`/activities/${id}/`);
    return response.data;
  },
  getMessages: async (resModel, resId) => {
    if (!resId && resModel) { resId = resModel; resModel = 'project.task'; }
    const response = await client.get('/activities/messages/', { params: { res_model: resModel, res_id: resId } });
    return response.data;
  },
  createMessage: async (resModel, resId, body) => {
    if (!body && resId) { body = resId; resId = resModel; resModel = 'project.task'; }
    const response = await client.post('/activities/messages/', { res_model: resModel, res_id: resId, body });
    return response.data;
  }
};
