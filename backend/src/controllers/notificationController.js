const { Op } = require('sequelize');
const Notification = require('../models/Notification');
const Alert = require('../models/Alert');

/**
 * GET /api/notifications
 */
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const unreadCount = await Notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * PUT /api/notifications/:id/read
 */
exports.markRead = async (req, res) => {
  try {
    const n = await Notification.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!n) return res.status(404).json({ message: 'Not found' });

    n.isRead = true;
    await n.save();

    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * PUT /api/notifications/read-all
 */
exports.markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/alerts
 */
exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * PUT /api/alerts/:id/read
 */
exports.markAlertRead = async (req, res) => {
  try {
    const a = await Alert.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!a) return res.status(404).json({ message: 'Not found' });
    a.isRead = true;
    await a.save();
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/alerts/send  (admin/leader)
 * Body: { userId, taskId?, message }
 */
exports.sendManualAlert = async (req, res) => {
  try {
    const { userId, taskId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ message: 'userId and message required' });
    }

    const alert = await Alert.create({
      userId,
      taskId: taskId || null,
      type: 'auto_reminder',
      message,
    });

    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('alert:new', alert);

    res.status(201).json({ message: 'Alert sent', alert });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};