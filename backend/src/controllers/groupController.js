const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');
const Task = require('../models/Task');
const TaskAssignment = require('../models/TaskAssignment');
const logActivity = require('../utils/logActivity');

// ==================== GROUP CRUD ====================

/**
 * POST /api/groups  (admin only)
 */
exports.createGroup = async (req, res) => {
  try {
    const { name, description, projectId, deadline } = req.body;

    const group = await Group.create({
      name,
      description,
      projectId: projectId || null,
      deadline: deadline || null,
      createdBy: req.user.id,
    });

    // Creator ko leader bana do
    await GroupMember.create({
      groupId: group.id,
      userId: req.user.id,
      role: 'leader',
      status: 'active',
    });

    await logActivity({
      req,
      action: 'group_created',
      entityType: 'group',
      entityId: group.id,
      entityName: group.name,
      groupId: group.id,
      projectId: group.projectId,
    });

    res.status(201).json({ message: 'Group created', group });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/groups
 * Admin: sab groups
 * Leader/Member: sirf apne groups
 */
exports.getGroups = async (req, res) => {
  try {
    let where = { deletedAt: null };

    if (req.user.role !== 'admin') {
      // Sirf apne active groups
      const memberships = await GroupMember.findAll({
        where: { userId: req.user.id, status: 'active' },
        attributes: ['groupId'],
      });
      const groupIds = memberships.map((m) => m.groupId);
      where.id = { [Op.in]: groupIds };
    }

    const groups = await Group.findAll({
      where,
      include: [
        {
          model: GroupMember,
          as: 'memberships',
          where: { status: 'active' },
          required: false,
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'designation', 'avatar'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ groups });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/groups/:id
 */
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findOne({
      where: { id: req.params.id, deletedAt: null },
      include: [
        {
          model: GroupMember,
          as: 'memberships',
          where: { status: 'active' },
          required: false,
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'designation', 'avatar'] }],
        },
      ],
    });

    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Permission: admin ya us group ka member
    if (req.user.role !== 'admin') {
      const isMember = group.memberships.some((m) => m.userId === req.user.id);
      if (!isMember) return res.status(403).json({ message: 'Access denied' });
    }

    // Stats
    const tasks = await Task.findAll({
      where: { groupId: group.id, deletedAt: null },
      attributes: ['status'],
    });
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const progress = total ? Math.round((done / total) * 100) : 0;

    res.json({
      group,
      stats: { total, done, pending: total - done, progress },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * PUT /api/groups/:id  (admin/leader)
 */
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group || group.deletedAt) return res.status(404).json({ message: 'Group not found' });

    const { name, description, deadline, status, projectId } = req.body;
    const oldValue = { name: group.name, description: group.description, status: group.status };

    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (deadline !== undefined) group.deadline = deadline;
    if (status !== undefined) group.status = status;
    if (projectId !== undefined) group.projectId = projectId;

    await group.save();

    await logActivity({
      req,
      action: 'group_updated',
      entityType: 'group',
      entityId: group.id,
      entityName: group.name,
      groupId: group.id,
      projectId: group.projectId,
      oldValue,
      newValue: { name: group.name, description: group.description, status: group.status },
      metadata: { isGroupLeader: req.user.role !== 'admin' },
    });

    res.json({ message: 'Group updated', group });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * DELETE /api/groups/:id  (admin only — soft delete)
 */
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group || group.deletedAt) return res.status(404).json({ message: 'Group not found' });

    group.deletedAt = new Date();
    group.deletedBy = req.user.id;
    group.status = 'archived';
    await group.save();

    await logActivity({
      req,
      action: 'group_archived',
      entityType: 'group',
      entityId: group.id,
      entityName: group.name,
      groupId: group.id,
      projectId: group.projectId,
    });

    res.json({ message: 'Group archived' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== MEMBER MANAGEMENT ====================

/**
 * GET /api/groups/:id/members
 * Active + past members
 */
exports.getMembers = async (req, res) => {
  try {
    const memberships = await GroupMember.findAll({
      where: { groupId: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'designation', 'avatar'] }],
      order: [['joinedAt', 'DESC']],
    });

    const active = memberships.filter((m) => m.status === 'active');
    const past = memberships.filter((m) => m.status !== 'active');

    res.json({ active, past });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/groups/:id/members  (admin/leader)
 * Add member to group
 */
exports.addMember = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const groupId = req.params.id;
    const { userId, role = 'member' } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    // Already active member?
    const existing = await GroupMember.findOne({
      where: { groupId, userId, status: 'active' },
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ message: 'User already in group' });
    }

    // Only admin can add leader
    if (role === 'leader' && req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: 'Only admin can add leader' });
    }

    const membership = await GroupMember.create(
      { groupId, userId, role, status: 'active' },
      { transaction: t }
    );

    await t.commit();

    await logActivity({
      req,
      action: 'member_added',
      entityType: 'member',
      entityId: membership.id,
      entityName: user.name,
      groupId,
      newValue: { userId, role },
      metadata: { isGroupLeader: req.user.role !== 'admin' },
    });

    res.status(201).json({ message: 'Member added', membership });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * PUT /api/groups/:id/members/:userId/role  (admin only)
 */
exports.changeMemberRole = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    const { role } = req.body;

    if (!['leader', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const membership = await GroupMember.findOne({
      where: { groupId, userId, status: 'active' },
    });
    if (!membership) return res.status(404).json({ message: 'Membership not found' });

    const oldRole = membership.role;
    membership.role = role;
    await membership.save();

    await logActivity({
      req,
      action: 'member_role_changed',
      entityType: 'member',
      entityId: membership.id,
      groupId,
      oldValue: { role: oldRole },
      newValue: { role },
    });

    res.json({ message: 'Role updated', membership });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/groups/:id/members/:userId/transfer
 * Transfer member to another group (admin/leader)
 */
exports.transferMember = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id: fromGroupId, userId } = req.params;
    const { toGroupId, reason } = req.body;

    if (!toGroupId) {
      await t.rollback();
      return res.status(400).json({ message: 'toGroupId required' });
    }

    if (fromGroupId === toGroupId) {
      await t.rollback();
      return res.status(400).json({ message: 'Cannot transfer to same group' });
    }

    const targetGroup = await Group.findByPk(toGroupId, { transaction: t });
    if (!targetGroup || targetGroup.deletedAt) {
      await t.rollback();
      return res.status(404).json({ message: 'Target group not found' });
    }

    // Old membership
    const oldMembership = await GroupMember.findOne({
      where: { groupId: fromGroupId, userId, status: 'active' },
      transaction: t,
    });
    if (!oldMembership) {
      await t.rollback();
      return res.status(404).json({ message: 'Active membership not found' });
    }

    // Already in target?
    const existingTarget = await GroupMember.findOne({
      where: { groupId: toGroupId, userId, status: 'active' },
      transaction: t,
    });
    if (existingTarget) {
      await t.rollback();
      return res.status(409).json({ message: 'User already in target group' });
    }

    // Update old
    oldMembership.leftAt = new Date();
    oldMembership.status = 'transferred';
    oldMembership.removedBy = req.user.id;
    oldMembership.removalReason = reason || 'Transferred';
    oldMembership.transferredToGroupId = toGroupId;
    await oldMembership.save({ transaction: t });

    // Create new
    const newMembership = await GroupMember.create(
      {
        groupId: toGroupId,
        userId,
        role: 'member',
        status: 'active',
      },
      { transaction: t }
    );

    await t.commit();

    await logActivity({
      req,
      action: 'member_transferred',
      entityType: 'member',
      entityId: oldMembership.id,
      entityName: targetGroup.name,
      groupId: fromGroupId,
      oldValue: { groupId: fromGroupId },
      newValue: { groupId: toGroupId },
      metadata: { reason, toGroupId, isGroupLeader: req.user.role !== 'admin' },
    });

    res.json({ message: 'Member transferred', oldMembership, newMembership });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/groups/:id/members/:userId/remove
 * Remove member + reassign tasks
 */
exports.removeMember = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id: groupId, userId } = req.params;
    const { reason, reassignTo } = req.body;

    const membership = await GroupMember.findOne({
      where: { groupId, userId, status: 'active' },
      transaction: t,
    });
    if (!membership) {
      await t.rollback();
      return res.status(404).json({ message: 'Active membership not found' });
    }

    // Reassign tasks (agar reassignTo diya)
    let reassignedCount = 0;
    if (reassignTo) {
      const targetMember = await GroupMember.findOne({
        where: { groupId, userId: reassignTo, status: 'active' },
        transaction: t,
      });
      if (!targetMember) {
        await t.rollback();
        return res.status(400).json({ message: 'Target reassign member not in group' });
      }

      const tasks = await Task.findAll({
        where: { groupId, assignedTo: userId, status: { [Op.ne]: 'done' }, deletedAt: null },
        transaction: t,
      });

      for (const task of tasks) {
        // Close old assignment
        await TaskAssignment.update(
          { unassignedAt: new Date(), reason: reason || 'Member removed' },
          { where: { taskId: task.id, unassignedAt: null }, transaction: t }
        );
        // New assignment
        await TaskAssignment.create(
          {
            taskId: task.id,
            userId: reassignTo,
            assignedBy: req.user.id,
            reason: reason || 'Reassigned due to member removal',
          },
          { transaction: t }
        );
        task.assignedTo = reassignTo;
        task.reassignedFrom = userId;
        task.reassignedAt = new Date();
        task.reassignedBy = req.user.id;
        await task.save({ transaction: t });
        reassignedCount++;
      }
    }

    membership.leftAt = new Date();
    membership.status = 'removed';
    membership.removedBy = req.user.id;
    membership.removalReason = reason || 'Removed';
    await membership.save({ transaction: t });

    await t.commit();

    await logActivity({
      req,
      action: 'member_removed',
      entityType: 'member',
      entityId: membership.id,
      groupId,
      newValue: { userId, reassignedCount },
      metadata: { reason, reassignTo, isGroupLeader: req.user.role !== 'admin' },
    });

    res.json({ message: 'Member removed', reassignedCount });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/groups/:id/members/:userId/replace
 * Replace member with another user
 */
exports.replaceMember = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id: groupId, userId } = req.params;
    const { newUserId, reassignTasks = true, reason } = req.body;

    if (!newUserId) {
      await t.rollback();
      return res.status(400).json({ message: 'newUserId required' });
    }

    const newUser = await User.findByPk(newUserId, { transaction: t });
    if (!newUser) {
      await t.rollback();
      return res.status(404).json({ message: 'New user not found' });
    }

    // Already active?
    const newExisting = await GroupMember.findOne({
      where: { groupId, userId: newUserId, status: 'active' },
      transaction: t,
    });
    if (newExisting) {
      await t.rollback();
      return res.status(409).json({ message: 'New user already in group' });
    }

    // Old membership remove
    const oldMembership = await GroupMember.findOne({
      where: { groupId, userId, status: 'active' },
      transaction: t,
    });
    if (!oldMembership) {
      await t.rollback();
      return res.status(404).json({ message: 'Old member not found' });
    }

    oldMembership.leftAt = new Date();
    oldMembership.status = 'removed';
    oldMembership.removedBy = req.user.id;
    oldMembership.removalReason = reason || 'Replaced';
    await oldMembership.save({ transaction: t });

    // Add new member
    const newMembership = await GroupMember.create(
      { groupId, userId: newUserId, role: 'member', status: 'active' },
      { transaction: t }
    );

    // Reassign tasks
    let reassignedCount = 0;
    if (reassignTasks) {
      const tasks = await Task.findAll({
        where: { groupId, assignedTo: userId, status: { [Op.ne]: 'done' }, deletedAt: null },
        transaction: t,
      });

      for (const task of tasks) {
        await TaskAssignment.update(
          { unassignedAt: new Date(), reason: 'Member replaced' },
          { where: { taskId: task.id, unassignedAt: null }, transaction: t }
        );
        await TaskAssignment.create(
          {
            taskId: task.id,
            userId: newUserId,
            assignedBy: req.user.id,
            reason: 'Member replaced',
          },
          { transaction: t }
        );
        task.assignedTo = newUserId;
        task.reassignedFrom = userId;
        task.reassignedAt = new Date();
        task.reassignedBy = req.user.id;
        await task.save({ transaction: t });
        reassignedCount++;
      }
    }

    await t.commit();

    await logActivity({
      req,
      action: 'member_removed',
      entityType: 'member',
      entityId: oldMembership.id,
      groupId,
      oldValue: { userId },
      newValue: { userId: newUserId, reassignedCount },
      metadata: { reason, isGroupLeader: req.user.role !== 'admin' },
    });

    res.json({ message: 'Member replaced', newMembership, reassignedCount });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/groups/:id/members/:userId/history
 * Member ki poori history us group mein
 */
exports.getMemberHistory = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;

    // Permission: admin ya leader ya khud
    if (req.user.role !== 'admin') {
      const check = await GroupMember.findOne({
        where: { groupId, userId: req.user.id, status: 'active' },
      });
      if (!check) return res.status(403).json({ message: 'Access denied' });
      if (check.role !== 'leader' && req.user.id !== userId) {
        return res.status(403).json({ message: 'Leader access required' });
      }
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'name', 'email', 'designation', 'avatar'] });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const memberships = await GroupMember.findAll({
      where: { groupId, userId },
      order: [['joinedAt', 'DESC']],
    });

    const tasks = await Task.findAll({
      where: { groupId, assignedTo: userId },
      order: [['createdAt', 'DESC']],
    });

    res.json({ user, memberships, tasks });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};