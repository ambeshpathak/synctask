import client from './client';

export const groupsApi = {
  list: () => client.get('/groups'),
  detail: (id) => client.get(`/groups/${id}`),
  members: (id) => client.get(`/groups/${id}/members`),
};