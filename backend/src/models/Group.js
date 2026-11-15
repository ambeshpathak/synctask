const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Group = sequelize.define('Group', {
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
  projectId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'archived'),
    defaultValue: 'active',
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
    { fields: ['projectId'] },
    { fields: ['status'] },
    { fields: ['createdBy'] },
    { fields: ['deletedAt'] },
  ],
});

module.exports = Group;