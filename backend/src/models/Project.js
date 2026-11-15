const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  status: {
    type: DataTypes.ENUM('planning', 'active', 'on_hold', 'completed', 'archived'),
    defaultValue: 'planning',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deletedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['status'] },
    { fields: ['createdBy'] },
    { fields: ['deletedAt'] },
  ],
});

module.exports = Project;