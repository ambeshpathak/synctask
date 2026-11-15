const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const WorkLog = sequelize.define('WorkLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM('started', 'paused', 'resumed', 'completed'),
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['taskId'] },
    { fields: ['userId'] },
    { fields: ['userId', 'startedAt'] },
  ],
});

module.exports = WorkLog;