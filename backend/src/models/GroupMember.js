const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GroupMember = sequelize.define('GroupMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('leader', 'member'),
    defaultValue: 'member',
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'transferred', 'removed', 'left'),
    defaultValue: 'active',
  },
  removedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  removalReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  transferredToGroupId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['groupId', 'status'] },
    { fields: ['userId'] },
    { fields: ['userId', 'status'] },
  ],
});

module.exports = GroupMember;