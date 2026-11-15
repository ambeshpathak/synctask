const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('deadline_approaching', 'overdue', 'auto_reminder', 'stuck_long'),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  indexes: [
    { fields: ['userId', 'isRead'] },
    { fields: ['taskId'] },
  ],
});

module.exports = Alert;