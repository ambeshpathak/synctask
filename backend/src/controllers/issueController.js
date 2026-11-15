const { Op } = require('sequelize');
const Issue = require('../models/Issue');
const IssueComment = require('../models/IssueComment');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');
const Group = require('../models/Group');
const Project = require('../models/Project');
const Task = require('../models/Task');
const logActivity = require('../utils/logActivity');

/**
 * POST /api/issues  (any authenticated user)
 */
exports.raiseIssue = async (req, res) => {
  try {
    const { title, description, type, priority, projectId, groupId, taskId } = req.body;

    const issue = await Issue.create({
      title,
      description: description || '',
      type: type || 'general',
      priority: priority || 'medium',
      projectId: projectId || null,
      groupId: groupId || null,
      taskId: taskId || null,
      raisedBy: req.user.id,
      status: 'open',
    });

    await logActivity({
      req,
      action: 'issue_raised',
      entityType: 'issue',
      entityId: issue.id,
      entityName: issue.title,
      groupId: issue.groupId,
      projectId: issue.projectId,
    });

    res.status(201).json({ message: 'Issue raised', issue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/issues
 * Query: ?status=&priority=&projectId=&groupId=
 */
exports.getIssues = async (req, res) => {
  try {
    const { status, priority, projectId, groupId } = req.query;
    const where = { deletedAt: null };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (groupId) where.groupId = groupId;

    // Role-based
    if (req.user.role !== 'admin') {
      const memberships = await GroupMember.findAll({
        where: { userId: req.user.id, status: 'active' },
        attributes: ['groupId'],
      });
      const myGroups = memberships.map((m) => m.groupId);

      where[Op.or] = [{ raisedBy: req.user.id }, { assignedTo: req.user.id }, { groupId: { [Op.in]: myGroups } }];
    }

    const issues = await Issue.findAll({
      where,
      include: [
        { model: User, as: 'raiser', attributes: ['id', 'name', 'designation'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'designation'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    res.json({ issues });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/issues/:id
 */
exports.getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findOne({
      where: { id: req.params.id, deletedAt: null },
      include: [
        { model: User, as: 'raiser', attributes: ['id', 'name', 'designation'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'designation'] },
        { model: User, as: 'resolver', attributes: ['id', 'name'] },
        { model: Group, as: 'group', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Task, as: 'task', attributes: ['id', 'title'] },
        {
          model: IssueComment,
          as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['id', 'name', 'designation'] }],
          order: [['createdAt', 'ASC']],
        },
      ],
    });

    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    res.json({ issue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/issues/:id/assign  (admin/leader)
 */
exports.assignIssue = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ message: 'assignedTo required' });

    const issue = await Issue.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    // Leader check (agar group hai)
    if (req.user.role !== 'admin' && issue.groupId) {
      const m = await GroupMember.findOne({
        where: { groupId: issue.groupId, userId: req.user.id, status: 'active' },
      });
      if (!m || m.role !== 'leader') {
        return res.status(403).json({ message: 'Leader/admin required' });
      }
    }

    const targetUser = await User.findByPk(assignedTo);
    if (!targetUser) return res.status(404).json({ message: 'Assignee not found' });

    issue.assignedTo = assignedTo;
    issue.status = 'in_progress';
    await issue.save();

    await logActivity({
      req,
      action: 'issue_assigned',
      entityType: 'issue',
      entityId: issue.id,
      entityName: issue.title,
      groupId: issue.groupId,
      projectId: issue.projectId,
      newValue: { assignedTo },
    });

    res.json({ message: 'Issue assigned', issue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/issues/:id/resolve
 */
exports.resolveIssue = async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    const issue = await Issue.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    // Only assignee, admin, leader
    if (req.user.role !== 'admin' && issue.assignedTo !== req.user.id) {
      if (issue.groupId) {
        const m = await GroupMember.findOne({
          where: { groupId: issue.groupId, userId: req.user.id, status: 'active' },
        });
        if (!m || m.role !== 'leader') {
          return res.status(403).json({ message: 'Not allowed' });
        }
      } else {
        return res.status(403).json({ message: 'Not allowed' });
      }
    }

    issue.status = 'resolved';
    issue.resolvedBy = req.user.id;
    issue.resolvedAt = new Date();
    issue.resolutionNote = resolutionNote || '';
    await issue.save();

    await logActivity({
      req,
      action: 'issue_resolved',
      entityType: 'issue',
      entityId: issue.id,
      entityName: issue.title,
      groupId: issue.groupId,
      projectId: issue.projectId,
      newValue: { resolutionNote },
    });

    res.json({ message: 'Issue resolved', issue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/issues/:id/close
 */
exports.closeIssue = async (req, res) => {
  try {
    const issue = await Issue.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    if (req.user.role !== 'admin' && issue.raisedBy !== req.user.id) {
      return res.status(403).json({ message: 'Only reporter/admin can close' });
    }

    issue.status = 'closed';
    await issue.save();

    await logActivity({
      req,
      action: 'issue_closed',
      entityType: 'issue',
      entityId: issue.id,
      entityName: issue.title,
      groupId: issue.groupId,
      projectId: issue.projectId,
    });

    res.json({ message: 'Issue closed', issue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/issues/:id/reopen
 */
exports.reopenIssue = async (req, res) => {
  try {
    const issue = await Issue.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    if (req.user.role !== 'admin' && issue.raisedBy !== req.user.id) {
      return res.status(403).json({ message: 'Only reporter/admin can reopen' });
    }

    issue.status = 'open';
    issue.resolvedBy = null;
    issue.resolvedAt = null;
    issue.resolutionNote = null;
    await issue.save();

    await logActivity({
      req,
      action: 'issue_reopened',
      entityType: 'issue',
      entityId: issue.id,
      entityName: issue.title,
      groupId: issue.groupId,
      projectId: issue.projectId,
    });

    res.json({ message: 'Issue reopened', issue });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/issues/:id/comments
 */
exports.addComment = async (req, res) => {
  try {
    const issue = await Issue.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const comment = await IssueComment.create({
      issueId: issue.id,
      userId: req.user.id,
      content: req.body.content,
    });

    await logActivity({
      req,
      action: 'commented',
      entityType: 'issue',
      entityId: issue.id,
      entityName: issue.title,
      groupId: issue.groupId,
      projectId: issue.projectId,
    });

    const full = await IssueComment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'designation'] }],
    });

    res.status(201).json({ message: 'Comment added', comment: full });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};