const GroupMember = require('../models/GroupMember');
const Group = require('../models/Group');

/**
 * Admin check (already auth.js mein hai, but yahan bhi export kar rahe hain)
 */
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * Dynamic: check karo ki user us group ka leader hai ya admin
 * groupId params se aata hai (req.params.groupId ya req.params.id)
 */
const isGroupLeaderOrAdmin = (paramName = 'groupId') => {
  return async (req, res, next) => {
    try {
      const groupId = req.params[paramName] || req.params.id;
      if (!groupId) {
        return res.status(400).json({ message: 'Group ID required' });
      }

      // Admin bypass
      if (req.user.role === 'admin') {
        req.groupMember = null;
        return next();
      }

      // Check membership
      const membership = await GroupMember.findOne({
        where: {
          groupId,
          userId: req.user.id,
          status: 'active',
        },
      });

      if (!membership || membership.role !== 'leader') {
        return res.status(403).json({ message: 'Group leader access required' });
      }

      req.groupMember = membership;
      next();
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
};

/**
 * Dynamic: check karo ki user us group ka member hai (ya admin)
 */
const isGroupMember = (paramName = 'groupId') => {
  return async (req, res, next) => {
    try {
      const groupId = req.params[paramName] || req.params.id;
      if (!groupId) {
        return res.status(400).json({ message: 'Group ID required' });
      }

      if (req.user.role === 'admin') {
        req.groupMember = null;
        return next();
      }

      const membership = await GroupMember.findOne({
        where: {
          groupId,
          userId: req.user.id,
          status: 'active',
        },
      });

      if (!membership) {
        return res.status(403).json({ message: 'Group member access required' });
      }

      req.groupMember = membership;
      next();
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
};

/**
 * Helper: user ka role us group mein
 * Returns: 'admin' | 'leader' | 'member' | null
 */
const getUserGroupRole = async (userId, groupId, globalRole) => {
  if (globalRole === 'admin') return 'admin';

  const membership = await GroupMember.findOne({
    where: { groupId, userId, status: 'active' },
  });

  if (!membership) return null;
  return membership.role;
};

module.exports = {
  isAdmin,
  isGroupLeaderOrAdmin,
  isGroupMember,
  getUserGroupRole,
};