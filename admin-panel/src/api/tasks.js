import client from './client';
export const tasksApi = {
  list: (params) => client.get('/tasks', { params }),
  detail: (id) => client.get(`/tasks/${id}`),
  create: (data) => client.post('/tasks', data),
  transfer: (id, data) => client.post(`/tasks/${id}/transfer`, data),
  deleted: () => client.get('/tasks/deleted'),
  restore: (id) => client.post(`/tasks/${id}/restore`),
};