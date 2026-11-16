import { useEffect } from 'react';
import { useSocketStore } from '../store/socketStore';
import toast from 'react-hot-toast';

export default function useRealtimeTasks(onUpdate) {
  const { socket } = useSocketStore();

  useEffect(() => {
    if (!socket) return;

    const handleTaskEvent = (data) => {
      console.log('⚡ Real-time update:', data);
      onUpdate();
    };

    socket.on('task:created', handleTaskEvent);
    socket.on('task:updated', handleTaskEvent);
    socket.on('task:deleted', handleTaskEvent);
    socket.on('task:started', (data) => {
      handleTaskEvent(data);
      toast.success('Task started!', { icon: '▶️' });
    });
    socket.on('task:completed', (data) => {
      handleTaskEvent(data);
      toast.success('Task completed!', { icon: '✅' });
    });
    socket.on('notification:new', (notif) => {
      toast(notif.title, { icon: '🔔' });
    });

    return () => {
      socket.off('task:created', handleTaskEvent);
      socket.off('task:updated', handleTaskEvent);
      socket.off('task:deleted', handleTaskEvent);
      socket.off('task:started');
      socket.off('task:completed');
      socket.off('notification:new');
    };
  }, [socket, onUpdate]);
}