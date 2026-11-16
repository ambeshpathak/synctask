import client from './client';
export const issuesApi = {
  list: (params) => client.get('/issues', { params }),
  detail: (id) => client.get(`/issues/${id}`),
  assign: (id, data) => client.post(`/issues/${id}/assign`, data),
  resolve: (id, data) => client.post(`/issues/${id}/resolve`, data),
};