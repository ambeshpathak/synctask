const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const IssueComment = sequelize.define('IssueComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  issueId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  indexes: [
    { fields: ['issueId'] },
    { fields: ['userId'] },
  ],
});

module.exports = IssueComment;