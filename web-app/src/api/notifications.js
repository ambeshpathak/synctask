import client from './client';

export const notificationsApi = {
  list: () => client.get('/notifications'),
  markRead: (id) => client.put(`/notifications/${id}/read`),
  markAllRead: () => client.put('/notifications/read-all'),
  unreadCount: () => client.get('/notifications/unread-count'),
};