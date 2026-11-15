const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  performedByRole: {
    type: DataTypes.ENUM('admin', 'leader', 'member'),
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM(
      'created', 'updated', 'deleted', 'restored',
      'assigned', 'reassigned', 'transferred',
      'started', 'paused', 'resumed', 'completed',
      'member_added', 'member_removed', 'member_transferred',
      'member_role_changed',
      'group_created', 'group_updated', 'group_deleted', 'group_archived',
      'project_created', 'project_updated', 'project_archived',
      'issue_raised', 'issue_assigned', 'issue_resolved',
      'issue_closed', 'issue_reopened',
      'commented'
    ),
    allowNull: false,
  },
  entityType: {
    type: DataTypes.ENUM('task', 'group', 'member', 'comment', 'user', 'project', 'issue'),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  entityName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  oldValue: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  newValue: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['groupId', 'createdAt'] },
    { fields: ['projectId', 'createdAt'] },
    { fields: ['entityType', 'entityId'] },
    { fields: ['action'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = Activity;