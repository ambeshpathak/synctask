import client from './client';
export const notificationsApi = {
  list: () => client.get('/notifications'),
  unreadCount: () => client.get('/notifications/unread-count'),
};