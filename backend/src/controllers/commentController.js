const { Op } = require('sequelize');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');
const logActivity = require('../utils/logActivity');

/**
 * POST /api/comments
 * Body: { content, type, groupId, taskId?, recipientId? }
 */
exports.createComment = async (req, res) => {
  try {
    const { content, type, groupId, taskId, recipientId } = req.body;

    if (!groupId) return res.status(400).json({ message: 'groupId required' });

    // Permission check
    const myMembership = await GroupMember.findOne({
      where: { groupId, userId: req.user.id, status: 'active' },
    });

    if (!myMembership && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not in this group' });
    }

    const isLeader = myMembership?.role === 'leader';

    // Type-specific checks
    if (type === 'group_broadcast' && !isLeader && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Leader/admin only for broadcast' });
    }

    if (type === 'task') {
      if (!taskId) return res.status(400).json({ message: 'taskId required for task comment' });
      const task = await Task.findByPk(taskId);
      if (!task) return res.status(404).json({ message: 'Task not found' });

      // Assignee, leader, admin can comment
      if (req.user.role !== 'admin' && !isLeader && task.assignedTo !== req.user.id) {
        return res.status(403).json({ message: 'Only assigned user/leader/admin' });
      }
    }

    if (type === 'private') {
      if (!recipientId) return res.status(400).json({ message: 'recipientId required for private' });

      const recipient = await GroupMember.findOne({
        where: { groupId, userId: recipientId, status: 'active' },
      });
      if (!recipient) return res.status(400).json({ message: 'Recipient not in group' });

      // Leader → member, member → leader only
      if (!isLeader && req.user.role !== 'admin') {
        if (recipient.role !== 'leader') {
          return res.status(403).json({ message: 'Members can only message leaders' });
        }
      }
    }

    const comment = await Comment.create({
      content,
      authorId: req.user.id,
      groupId,
      taskId: taskId || null,
      recipientId: recipientId || null,
      type,
    });

    await logActivity({
      req,
      action: 'commented',
      entityType: 'comment',
      entityId: comment.id,
      groupId,
      metadata: { isGroupLeader: isLeader, type },
    });

    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'designation', 'avatar'] }],
    });

    res.status(201).json({ message: 'Comment created', comment: full });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/comments/task/:taskId
 */
exports.getTaskComments = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const m = await GroupMember.findOne({
      where: { groupId: task.groupId, userId: req.user.id, status: 'active' },
    });
    if (!m && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (m && m.role !== 'leader' && task.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comments = await Comment.findAll({
      where: { taskId: task.id, type: 'task', isDeleted: false },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'designation', 'avatar'] }],
      order: [['createdAt', 'ASC']],
    });

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/comments/group/:groupId
 * Broadcasts + group chat
 */
exports.getGroupComments = async (req, res) => {
  try {
    const m = await GroupMember.findOne({
      where: { groupId: req.params.groupId, userId: req.user.id, status: 'active' },
    });
    if (!m && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const comments = await Comment.findAll({
      where: {
        groupId: req.params.groupId,
        type: 'group_broadcast',
        isDeleted: false,
      },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'designation', 'avatar'] }],
      order: [['createdAt', 'ASC']],
    });

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/comments/inbox
 */
exports.getInbox = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: {
        recipientId: req.user.id,
        type: 'private',
        isDeleted: false,
      },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'designation', 'avatar'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/comments/sent
 */
exports.getSent = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: {
        authorId: req.user.id,
        type: 'private',
        isDeleted: false,
      },
      include: [{ model: User, as: 'recipient', attributes: ['id', 'name', 'designation'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * DELETE /api/comments/:id (soft delete)
 */
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment || comment.isDeleted) return res.status(404).json({ message: 'Comment not found' });

    if (req.user.role !== 'admin' && comment.authorId !== req.user.id) {
      // Leader can delete group comments
      const m = await GroupMember.findOne({
        where: { groupId: comment.groupId, userId: req.user.id, status: 'active' },
      });
      if (!m || m.role !== 'leader') {
        return res.status(403).json({ message: 'Not allowed' });
      }
    }

    comment.isDeleted = true;
    await comment.save();

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};