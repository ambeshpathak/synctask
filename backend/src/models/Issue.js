const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Issue = sequelize.define('Issue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  type: {
    type: DataTypes.ENUM('task', 'project', 'blocking', 'general'),
    defaultValue: 'general',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed', 'wont_fix'),
    defaultValue: 'open',
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  raisedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resolutionNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['status'] },
    { fields: ['projectId', 'status'] },
    { fields: ['groupId', 'status'] },
    { fields: ['assignedTo', 'status'] },
    { fields: ['taskId'] },
  ],
});

module.exports = Issue;