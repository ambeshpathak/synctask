import client from './client';

export const tasksApi = {
  list: (params) => client.get('/tasks', { params }),
  detail: (id) => client.get(`/tasks/${id}`),
  create: (data) => client.post('/tasks', data),
  update: (id, data) => client.put(`/tasks/${id}`, data),
  delete: (id) => client.delete(`/tasks/${id}`),
  restore: (id) => client.post(`/tasks/${id}/restore`),
  transfer: (id, data) => client.post(`/tasks/${id}/transfer`, data),
  start: (id) => client.post(`/tasks/${id}/start`),
  pause: (id) => client.post(`/tasks/${id}/pause`),
  complete: (id) => client.post(`/tasks/${id}/complete`),
  history: (id) => client.get(`/tasks/${id}/history`),
};