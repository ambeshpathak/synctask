import client from './client';

export const commentsApi = {
  create: (data) => client.post('/comments', data),
  taskComments: (taskId) => client.get(`/comments/task/${taskId}`),
  groupComments: (groupId) => client.get(`/comments/group/${groupId}`),
  inbox: () => client.get('/comments/inbox'),
  sent: () => client.get('/comments/sent'),
};