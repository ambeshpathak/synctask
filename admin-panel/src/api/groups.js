import client from './client';
export const groupsApi = {
  list: () => client.get('/groups'),
  detail: (id) => client.get(`/groups/${id}`),
  members: (id) => client.get(`/groups/${id}/members`),
  create: (data) => client.post('/groups', data),
  transferMember: (groupId, userId, data) => client.post(`/groups/${groupId}/members/${userId}/transfer`, data),
  removeMember: (groupId, userId, data) => client.post(`/groups/${groupId}/members/${userId}/remove`, data),
};