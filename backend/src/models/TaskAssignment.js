const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaskAssignment = sequelize.define('TaskAssignment', {
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
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assignedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  unassignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['taskId'] },
    { fields: ['userId'] },
    { fields: ['taskId', 'unassignedAt'] },
  ],
});

module.exports = TaskAssignment;