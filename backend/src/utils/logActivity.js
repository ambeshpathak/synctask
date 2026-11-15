const Activity = require('../models/Activity');

/**
 * Activity log create karo
 *
 * @param {Object} opts
 * @param {Object} opts.req - Express request
 * @param {String} opts.action - Activity action
 * @param {String} opts.entityType - 'task' | 'group' | 'member' | 'comment' | 'user' | 'project' | 'issue'
 * @param {String} opts.entityId
 * @param {String} opts.entityName
 * @param {String} opts.groupId
 * @param {String} opts.projectId
 * @param {Object} opts.oldValue
 * @param {Object} opts.newValue
 * @param {Object} opts.metadata
 * @param {String} opts.performedByRole - 'admin' | 'leader' | 'member' (optional, auto-detect)
 */
const logActivity = async ({
  req,
  action,
  entityType,
  entityId = null,
  entityName = null,
  groupId = null,
  projectId = null,
  oldValue = null,
  newValue = null,
  metadata = null,
  performedByRole = null,
}) => {
  try {
    let role = performedByRole;
    if (!role) {
      if (req.user.role === 'admin') role = 'admin';
      else if (metadata?.isGroupLeader) role = 'leader';
      else role = 'member';
    }

    return await Activity.create({
      userId: req.user.id,
      performedByRole: role,
      action,
      entityType,
      entityId,
      entityName,
      groupId,
      projectId,
      oldValue,
      newValue,
      metadata,
    });
  } catch (err) {
    console.error('⚠️ Activity log failed:', err.message);
    return null;
  }
};

module.exports = logActivity;