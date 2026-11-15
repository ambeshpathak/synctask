const { sequelize } = require('../config/db');
const User = require('./User');
const Project = require('./Project');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Task = require('./Task');
const TaskAssignment = require('./TaskAssignment');
const WorkLog = require('./WorkLog');
const Comment = require('./Comment');
const Issue = require('./Issue');
const IssueComment = require('./IssueComment');
const Activity = require('./Activity');
const Notification = require('./Notification');
const Alert = require('./Alert');

// ==================== USER ↔ GROUP (via GroupMember) ====================
User.belongsToMany(Group, {
  through: GroupMember,
  foreignKey: 'userId',
  otherKey: 'groupId',
  as: 'groups',
});
Group.belongsToMany(User, {
  through: GroupMember,
  foreignKey: 'groupId',
  otherKey: 'userId',
  as: 'members',
});

GroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
User.hasMany(GroupMember, { foreignKey: 'userId', as: 'memberships' });
Group.hasMany(GroupMember, { foreignKey: 'groupId', as: 'memberships' });

// ==================== PROJECT ↔ GROUP ====================
Project.hasMany(Group, { foreignKey: 'projectId', as: 'groups' });
Group.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Project.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// ==================== GROUP ↔ TASK ====================
Group.hasMany(Task, { foreignKey: 'groupId', as: 'tasks' });
Task.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

// ==================== USER ↔ TASK ====================
User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
User.hasMany(Task, { foreignKey: 'assignedBy', as: 'tasksAssignedByMe' });
Task.belongsTo(User, { foreignKey: 'assignedBy', as: 'assigner' });

// ==================== TASK ↔ TASKASSIGNMENT ====================
Task.hasMany(TaskAssignment, { foreignKey: 'taskId', as: 'assignments' });
TaskAssignment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
TaskAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
TaskAssignment.belongsTo(User, { foreignKey: 'assignedBy', as: 'assigner' });

// ==================== TASK ↔ WORKLOG ====================
Task.hasMany(WorkLog, { foreignKey: 'taskId', as: 'workLogs' });
WorkLog.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
WorkLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ==================== COMMENT ====================
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Comment.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
Comment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Comment.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

// ==================== ISSUE ====================
Issue.belongsTo(User, { foreignKey: 'raisedBy', as: 'raiser' });
Issue.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
Issue.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });
Issue.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Issue.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
Issue.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Issue.hasMany(IssueComment, { foreignKey: 'issueId', as: 'comments' });

IssueComment.belongsTo(Issue, { foreignKey: 'issueId', as: 'issue' });
IssueComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// ==================== ACTIVITY ====================
Activity.belongsTo(User, { foreignKey: 'userId', as: 'actor' });
Activity.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
Activity.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// ==================== NOTIFICATION ====================
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ==================== ALERT ====================
Alert.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Alert.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

module.exports = {
  sequelize,
  User,
  Project,
  Group,
  GroupMember,
  Task,
  TaskAssignment,
  WorkLog,
  Comment,
  Issue,
  IssueComment,
  Activity,
  Notification,
  Alert,
};