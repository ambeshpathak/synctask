const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Task = require('../models/Task');
const TaskAssignment = require('../models/TaskAssignment');
const WorkLog = require('../models/WorkLog');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');
const Group = require('../models/Group');
const logActivity = require('../utils/logActivity');

// Helper: user us group ka member/leader hai?
const checkGroupAccess = async (userId, role, groupId) => {
  if (role === 'admin') return { allowed: true, groupRole: 'admin' };
  const m = await GroupMember.findOne({ where: { groupId, userId, status: 'active' } });
  if (!m) return { allowed: false };
  return { allowed: true, groupRole: m.role };
};

// ==================== CREATE ====================

/**
 * POST /api/tasks  (admin/leader)
 * Body: { title, description, priority, groupId, assignedTo?, deadline?, estimatedHours? }
 */
exports.createTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { title, description, priority, groupId, assignedTo, deadline, estimatedHours } = req.body;

    if (!groupId) {
      await t.rollback();
      return res.status(400).json({ message: 'groupId required' });
    }

    const access = await checkGroupAccess(req.user.id, req.user.role, groupId);
    if (!access.allowed || (req.user.role !== 'admin' && access.groupRole !== 'leader')) {
      await t.rollback();
      return res.status(403).json({ message: 'Only leader/admin can create task in this group' });
    }

    // Agar assignedTo diya toh verify karo
    if (assignedTo) {
      const m = await GroupMember.findOne({
        where: { groupId, userId: assignedTo, status: 'active' },
        transaction: t,
      });
      if (!m) {
        await t.rollback();
        return res.status(400).json({ message: 'Assigned user not in group' });
      }
    }

    const task = await Task.create(
      {
        title,
        description: description || '',
        priority: priority || 'medium',
        groupId,
        assignedTo: assignedTo || null,
        assignedBy: assignedTo ? req.user.id : null,
        deadline: deadline || null,
        estimatedHours: estimatedHours || null,
      },
      { transaction: t }
    );

    // TaskAssignment history
    if (assignedTo) {
      await TaskAssignment.create(
        {
          taskId: task.id,
          userId: assignedTo,
          assignedBy: req.user.id,
        },
        { transaction: t }
      );
    }

    await t.commit();

    await logActivity({
      req,
      action: 'created',
      entityType: 'task',
      entityId: task.id,
      entityName: task.title,
      groupId,
      newValue: { title, priority, assignedTo },
      metadata: { isGroupLeader: req.user.role !== 'admin' },
    });

    if (assignedTo) {
      await logActivity({
        req,
        action: 'assigned',
        entityType: 'task',
        entityId: task.id,
        entityName: task.title,
        groupId,
        newValue: { assignedTo },
        metadata: { isGroupLeader: req.user.role !== 'admin' },
      });
    }

    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== LIST ====================

/**
 * GET /api/tasks
 * Query: ?lifecycle=upcoming|current|completed&groupId=&assignedTo=&priority=
 */
exports.getTasks = async (req, res) => {
  try {
    const { lifecycle, groupId, assignedTo, priority } = req.query;
    const where = { deletedAt: null };

    // Role-based filter
    if (req.user.role !== 'admin') {
      // Apne groups
      const memberships = await GroupMember.findAll({
        where: { userId: req.user.id, status: 'active' },
        attributes: ['groupId', 'role'],
      });
      const myGroupIds = memberships.map((m) => m.groupId);
      const leaderOf = memberships.filter((m) => m.role === 'leader').map((m) => m.groupId);

      // Leader: apne group ke sab tasks; Member: sirf assigned
      const orConditions = [];
      if (leaderOf.length) orConditions.push({ groupId: { [Op.in]: leaderOf } });
      orConditions.push({ assignedTo: req.user.id });

      where[Op.or] = orConditions;
    }

    if (groupId) where.groupId = groupId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (priority) where.priority = priority;

    // Lifecycle filter
    if (lifecycle === 'upcoming') {
      where.status = 'todo';
    } else if (lifecycle === 'current') {
      where.status = 'in_progress';
    } else if (lifecycle === 'completed') {
      where.status = 'done';
    }

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'designation', 'avatar'] },
        { model: User, as: 'assigner', attributes: ['id', 'name'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
      ],
      order: [
        ['deadline', 'ASC NULLS LAST'],
        ['createdAt', 'DESC'],
      ],
    });

    // Overdue flag calculate
    const now = new Date();
    const enriched = tasks.map((task) => {
      const t = task.toJSON();
      t.isOverdue = t.deadline && new Date(t.deadline) < now && t.status !== 'done';
      return t;
    });

    res.json({ tasks: enriched });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== DETAIL ====================

/**
 * GET /api/tasks/:id
 */
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, deletedAt: null },
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'designation', 'avatar'] },
        { model: User, as: 'assigner', attributes: ['id', 'name'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
        { model: TaskAssignment, as: 'assignments', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
        { model: WorkLog, as: 'workLogs', include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
      ],
    });

    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Access check
    if (req.user.role !== 'admin') {
      const access = await checkGroupAccess(req.user.id, req.user.role, task.groupId);
      if (!access.allowed) return res.status(403).json({ message: 'Access denied' });
      if (access.groupRole !== 'leader' && task.assignedTo !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== UPDATE ====================

/**
 * PUT /api/tasks/:id  (admin/leader/assignee)
 */
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Access
    if (req.user.role !== 'admin') {
      const access = await checkGroupAccess(req.user.id, req.user.role, task.groupId);
      if (!access.allowed) return res.status(403).json({ message: 'Access denied' });
      if (access.groupRole !== 'leader' && task.assignedTo !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const { title, description, priority, status, deadline, estimatedHours } = req.body;
    const oldValue = { title: task.title, priority: task.priority, status: task.status };

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (deadline !== undefined) task.deadline = deadline;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;

    await task.save();

    await logActivity({
      req,
      action: 'updated',
      entityType: 'task',
      entityId: task.id,
      entityName: task.title,
      groupId: task.groupId,
      oldValue,
      newValue: { title: task.title, priority: task.priority, status: task.status },
      metadata: { isGroupLeader: req.user.role !== 'admin' },
    });

    res.json({ message: 'Task updated', task });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== SOFT DELETE ====================

/**
 * DELETE /api/tasks/:id  (admin/leader/assignee)
 */
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'admin') {
      const access = await checkGroupAccess(req.user.id, req.user.role, task.groupId);
      if (!access.allowed) return res.status(403).json({ message: 'Access denied' });
      if (access.groupRole !== 'leader' && task.assignedTo !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    task.deletedAt = new Date();
    task.deletedBy = req.user.id;
    await task.save();

    await logActivity({
      req,
      action: 'deleted',
      entityType: 'task',
      entityId: task.id,
      entityName: task.title,
      groupId: task.groupId,
      metadata: { isGroupLeader: req.user.role !== 'admin' },
    });

    res.json({ message: 'Task soft-deleted', taskId: task.id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/tasks/:id/restore  (admin/leader)
 */
exports.restoreTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!task.deletedAt) return res.status(400).json({ message: 'Task not deleted' });

    // Leader check (apne group)
    if (req.user.role !== 'admin') {
      const access = await checkGroupAccess(req.user.id, req.user.role, task.groupId);
      if (!access.allowed || access.groupRole !== 'leader') {
        return res.status(403).json({ message: 'Leader/admin required' });
      }
    }

    task.deletedAt = null;
    task.deletedBy = null;
    await task.save();

    await logActivity({
      req,
      action: 'restored',
      entityType: 'task',
      entityId: task.id,
      entityName: task.title,
      groupId: task.groupId,
      metadata: { isGroupLeader: req.user.role !== 'admin' },
    });

    res.json({ message: 'Task restored', task });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== TRANSFER ====================

/**
 * POST /api/tasks/:id/transfer  (admin/leader)
 * Body: { toUserId, reason? }
 */
exports.transferTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { toUserId, reason } = req.body;
    if (!toUserId) {
      await t.rollback();
      return res.status(400).json({ message: 'toUserId required' });
    }

    const task = await Task.findOne({ where: { id: req.params.id, deletedAt: null }, transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: 'Task not found' });
    }

    // Access
    if (req.user.role !== 'admin') {
      const access = await checkGroupAccess(req.user.id, req.user.role, task.groupId);
      if (!access.allowed || access.groupRole !== 'leader') {
        await t.rollback();
        return res.status(403).json({ message: 'Leader/admin required' });
      }
    }

    if (task.assignedTo === toUserId) {
      await t.rollback();
      return res.status(400).json({ message: 'Already assigned to this user' });
    }

    // Target member us group ka hai?
    const target = await GroupMember.findOne({
      where: { groupId: task.groupId, userId: toUserId, status: 'active' },
      transaction: t,
    });
    if (!target) {
      await t.rollback();
      return res.status(400).json({ message: 'Target user not in group' });
    }

    const oldAssignee = task.assignedTo;

    // Close old assignment
    if (oldAssignee) {
      await TaskAssignment.update(
        { unassignedAt: new Date(), reason: reason || 'Transferred' },
        { where: { taskId: task.id, unassignedAt: null }, transaction: t }
      );
    }

    // New assignment
    await TaskAssignment.create(
      {
        taskId: task.id,
        userId: toUserId,
        assignedBy: req.user.id,
        reason: reason || 'Transferred',
      },
      { transaction: t }
    );

    // Update task
    task.assignedTo = toUserId;
    task.assignedBy = req.user.id;
    task.reassignedFrom = oldAssignee;
    task.reassignedAt = new Date();
    task.reassignedBy = req.user.id;
    // Reset progress? No — status same rakho
    await task.save({ transaction: t });

    await t.commit();

    await logActivity({
      req,
      action: 'reassigned',
      entityType: 'task',
      entityId: task.id,
      entityName: task.title,
      groupId: task.groupId,
      oldValue: { assignedTo: oldAssignee },
      newValue: { assignedTo: toUserId },
      metadata: { reason, isGroupLeader: req.user.role !== 'admin' },
    });

    res.json({ message: 'Task transferred', task });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== TIMER: START ====================

/**
 * POST /api/tasks/:id/start  (assignee only)
 */
exports.startTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const task = await Task.findOne({ where: { id: req.params.id, deletedAt: null }, transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignedTo !== req.user.id && req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: 'Only assignee can start' });
    }

    if (task.status === 'done') {
      await t.rollback();
      return res.status(400).json({ message: 'Task already completed' });
    }

    if (task.status === 'in_progress' && !task.pausedAt) {
      await t.rollback();
      return res.status(400).json({ message: 'Timer already running' });
    }

    const now = new Date();

    if (task.status === 'todo') {
      task.status = 'in_progress';
      task.startedAt = now;
    }
    task.pausedAt = null;

    await WorkLog.create(
      {
        taskId: task.id,
        userId: req.user.id,
        action: task.startedAt && task.startedAt < now ? 'resumed' : 'started',
        startedAt: now,
      },
      { transaction: t }
    );

    await task.save({ transaction: t });
    await t.commit();

    await logActivity({
      req,
      action: 'started',
      entityType: 'task',
      entityId: task.id,
      entityName: task.title,
      groupId: task.groupId,
    });

    res.json({ message: 'Timer started', task });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== TIMER: PAUSE ====================

/**
 * POST /api/tasks/:id/pause
 */
exports.pauseTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const task = await Task.findOne({ where: { id: req.params.id, deletedAt: null }, transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignedTo !== req.user.id && req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: 'Only assignee can pause' });
    }

    if (task.status !== 'in_progress' || task.pausedAt) {
      await t.rollback();
      return res.status(400).json({ message: 'Timer not running' });
    }

    const now = new Date();

    // Open WorkLog close karo
    const openLog = await WorkLog.findOne({
      where: { taskId: task.id, userId: req.user.id, endedAt: null },
      order: [['startedAt', 'DESC']],
      transaction: t,
    });
    if (openLog) {
      openLog.endedAt = now;
      openLog.durationMinutes = Math.round((now - new Date(openLog.startedAt)) / 60000);
      await openLog.save({ transaction: t });
    }

    task.pausedAt = now;
    await task.save({ transaction: t });
    await t.commit();

    await logActivity({
      req,
      action: 'paused',
      entityType: 'task',
      entityId: task.id,
      entityName: task.title,
      groupId: task.groupId,
    });

    res.json({ message: 'Timer paused', task });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== TIMER: COMPLETE ====================

/**
 * POST /api/tasks/:id/complete
 */
exports.completeTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const task = await Task.findOne({ where: { id: req.params.id, deletedAt: null }, transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignedTo !== req.user.id && req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ message: 'Only assignee can complete' });
    }

    if (task.status === 'done') {
      await t.rollback();
      return res.status(400).json({ message: 'Task already completed' });
    }

    const now = new Date();

    // Open worklog close
    const openLog = await WorkLog.findOne({
      where: { taskId: task.id, userId: req.user.id, endedAt: null },
      order: [['startedAt', 'DESC']],
      transaction: t,
    });
    if (openLog) {
      openLog.endedAt = now;
      openLog.durationMinutes = Math.round((now - new Date(openLog.startedAt)) / 60000);
      await openLog.save({ transaction: t });
    }

    task.status = 'done';
    task.completedAt = now;
    task.pausedAt = null;
    await task.save({ transaction: t });
    await t.commit();

    await logActivity({
      req,
      action: 'completed',
      entityType: 'task',
      entityId: task.id,
      entityName: task.title,
      groupId: task.groupId,
    });

    res.json({ message: 'Task completed', task });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ==================== HISTORY ====================

/**
 * GET /api/tasks/:id/history
 */
exports.getTaskHistory = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Access
    if (req.user.role !== 'admin') {
      const access = await checkGroupAccess(req.user.id, req.user.role, task.groupId);
      if (!access.allowed) return res.status(403).json({ message: 'Access denied' });
      if (access.groupRole !== 'leader' && task.assignedTo !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const assignments = await TaskAssignment.findAll({
      where: { taskId: task.id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'designation'] },
        { model: User, as: 'assigner', attributes: ['id', 'name'] },
      ],
      order: [['assignedAt', 'DESC']],
    });

    const workLogs = await WorkLog.findAll({
      where: { taskId: task.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['startedAt', 'DESC']],
    });

    const totalMinutes = workLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

    res.json({ task, assignments, workLogs, totalMinutes });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/tasks/deleted  (admin/leader)
 */
exports.getDeletedTasks = async (req, res) => {
  try {
    const where = { deletedAt: { [Op.ne]: null } };

    if (req.user.role !== 'admin') {
      const leaderMemberships = await GroupMember.findAll({
        where: { userId: req.user.id, status: 'active', role: 'leader' },
        attributes: ['groupId'],
      });
      const leaderGroups = leaderMemberships.map((m) => m.groupId);
      where.groupId = { [Op.in]: leaderGroups };
    }

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
      ],
      order: [['deletedAt', 'DESC']],
    });

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};