const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Task = sequelize.define('Task', {
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
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'done'),
    defaultValue: 'todo',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  estimatedHours: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pausedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deletedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  reassignedFrom: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  reassignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reassignedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['groupId', 'status'] },
    { fields: ['assignedTo', 'status'] },
    { fields: ['deletedAt'] },
    { fields: ['deadline'] },
  ],
});

module.exports = Task;