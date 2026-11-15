const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GroupMember = require('../models/GroupMember');

let io = null;

/**
 * Socket.IO initialize karo
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.WEB_URL, process.env.ADMIN_URL],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Cookie se bhi try karo
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc, c) => {
          const [k, v] = c.trim().split('=');
          acc[k] = v;
          return acc;
        }, {});
        token = cookies.accessToken;
      }

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'name', 'email', 'role'],
      });

      if (!user || !user.isActive) return next(new Error('User not found'));

      socket.userId = user.id;
      socket.userRole = user.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 Socket connected: ${socket.userId}`);

    // User room
    socket.join(`user:${socket.userId}`);

    // Admin room
    if (socket.userRole === 'admin') {
      socket.join('admin');
    }

    // Apne groups ke rooms mein join karo
    try {
      const memberships = await GroupMember.findAll({
        where: { userId: socket.userId, status: 'active' },
        attributes: ['groupId', 'role'],
      });

      for (const m of memberships) {
        socket.join(`group:${m.groupId}`);
        if (m.role === 'leader') {
          socket.join(`group:${m.groupId}:leaders`);
        }
      }
    } catch (err) {
      console.error('Room join error:', err.message);
    }

    // Task room join (specific task dekhne ke liye)
    socket.on('task:join', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('task:leave', (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    // Project room join
    socket.on('project:join', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
};

/**
 * Getter — controllers se use karne ke liye
 */
const getIO = () => io;

module.exports = { initSocket, getIO };