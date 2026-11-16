import client from './client';

export const issuesApi = {
  list: (params) => client.get('/issues', { params }),
  detail: (id) => client.get(`/issues/${id}`),
  raise: (data) => client.post('/issues', data),
  assign: (id, data) => client.post(`/issues/${id}/assign`, data),
  resolve: (id, data) => client.post(`/issues/${id}/resolve`, data),
  close: (id) => client.post(`/issues/${id}/close`),
};