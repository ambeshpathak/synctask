const Notification = require('../models/Notification');

/**
 * Notification create karo + socket se emit karo
 *
 * @param {Object} io - Socket.IO instance
 * @param {Object} opts
 * @param {String} opts.userId - kisko
 * @param {String} opts.type - notification type
 * @param {String} opts.title
 * @param {String} opts.message
 * @param {String} opts.link - frontend route (optional)
 * @param {String} opts.entityType
 * @param {String} opts.entityId
 */
const sendNotification = async (io, {
  userId,
  type,
  title,
  message = null,
  link = null,
  entityType = null,
  entityId = null,
}) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      entityType,
      entityId,
    });

    // Socket se real-time bhejo
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification);
    }

    return notification;
  } catch (err) {
    console.error('⚠️ Notification failed:', err.message);
    return null;
  }
};

module.exports = sendNotification;