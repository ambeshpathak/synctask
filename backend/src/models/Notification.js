const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      'task_assigned', 'task_transferred', 'task_completed',
      'task_overdue', 'comment_new', 'issue_raised',
      'issue_assigned', 'issue_resolved',
      'member_added', 'member_removed', 'member_transferred',
      'deadline_approaching', 'alert_manual', 'mention'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  entityType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  indexes: [
    { fields: ['userId', 'isRead'] },
    { fields: ['userId', 'createdAt'] },
  ],
});

module.exports = Notification;