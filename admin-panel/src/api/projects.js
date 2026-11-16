import client from './client';
export const projectsApi = {
  list: () => client.get('/projects'),
  detail: (id) => client.get(`/projects/${id}`),
  create: (data) => client.post('/projects', data),
};