const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  authorId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  recipientId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('task', 'group_broadcast', 'private'),
    allowNull: false,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  indexes: [
    { fields: ['taskId'] },
    { fields: ['recipientId'] },
    { fields: ['groupId'] },
    { fields: ['authorId'] },
  ],
});

module.exports = Comment;