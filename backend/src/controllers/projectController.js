const { Op } = require('sequelize');
const Project = require('../models/Project');
const Group = require('../models/Group');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const User = require('../models/User');
const logActivity = require('../utils/logActivity');

/**
 * POST /api/projects (admin only)
 */
exports.createProject = async (req, res) => {
  try {
    const { name, description, priority, startDate, deadline } = req.body;

    const project = await Project.create({
      name,
      description: description || '',
      priority: priority || 'medium',
      startDate: startDate || null,
      deadline: deadline || null,
      createdBy: req.user.id,
    });

    await logActivity({
      req,
      action: 'project_created',
      entityType: 'project',
      entityId: project.id,
      entityName: project.name,
      projectId: project.id,
    });

    res.status(201).json({ message: 'Project created', project });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/projects
 * Admin: sab, Leader/Member: jis project mein unka group hai
 */
exports.getProjects = async (req, res) => {
  try {
    let where = { deletedAt: null };

    if (req.user.role !== 'admin') {
      // Apne groups ke projects
      const GroupMember = require('../models/GroupMember');
      const memberships = await GroupMember.findAll({
        where: { userId: req.user.id, status: 'active' },
        include: [{ model: Group, as: 'group', attributes: ['projectId'] }],
      });
      const projectIds = memberships
        .map((m) => m.group?.projectId)
        .filter((id) => id);
      where.id = { [Op.in]: [...new Set(projectIds)] };
    }

    const projects = await Project.findAll({
      where,
      include: [
        {
          model: Group,
          as: 'groups',
          where: { deletedAt: null },
          required: false,
          attributes: ['id', 'name', 'status', 'deadline'],
        },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Har project ka stats
    const enriched = await Promise.all(
      projects.map(async (p) => {
        const tasks = await Task.findAll({
          where: { groupId: { [Op.in]: p.groups.map((g) => g.id) }, deletedAt: null },
          attributes: ['status'],
        });
        const total = tasks.length;
        const done = tasks.filter((t) => t.status === 'done').length;

        const issues = await Issue.count({
          where: { projectId: p.id, status: { [Op.in]: ['open', 'in_progress'] }, deletedAt: null },
        });

        const pJson = p.toJSON();
        pJson.stats = {
          totalTasks: total,
          doneTasks: done,
          progress: total ? Math.round((done / total) * 100) : 0,
          openIssues: issues,
        };
        return pJson;
      })
    );

    res.json({ projects: enriched });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/projects/:id
 */
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, deletedAt: null },
      include: [
        {
          model: Group,
          as: 'groups',
          where: { deletedAt: null },
          required: false,
          attributes: ['id', 'name', 'status', 'deadline', 'description'],
        },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Stats
    const groupIds = project.groups.map((g) => g.id);
    const tasks = await Task.findAll({
      where: { groupId: { [Op.in]: groupIds }, deletedAt: null },
      attributes: ['status'],
    });
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;

    const issues = await Issue.findAll({
      where: { projectId: project.id, deletedAt: null },
      attributes: ['status', 'priority'],
    });

    res.json({
      project,
      stats: {
        totalTasks: total,
        doneTasks: done,
        progress: total ? Math.round((done / total) * 100) : 0,
        openIssues: issues.filter((i) => ['open', 'in_progress'].includes(i.status)).length,
        criticalIssues: issues.filter(
          (i) => i.priority === 'critical' && ['open', 'in_progress'].includes(i.status)
        ).length,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * PUT /api/projects/:id (admin only)
 */
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { name, description, priority, status, startDate, deadline } = req.body;
    const oldValue = { name: project.name, status: project.status, priority: project.priority };

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (priority !== undefined) project.priority = priority;
    if (status !== undefined) project.status = status;
    if (startDate !== undefined) project.startDate = startDate;
    if (deadline !== undefined) project.deadline = deadline;

    await project.save();

    await logActivity({
      req,
      action: 'project_updated',
      entityType: 'project',
      entityId: project.id,
      entityName: project.name,
      projectId: project.id,
      oldValue,
      newValue: { name: project.name, status: project.status, priority: project.priority },
    });

    res.json({ message: 'Project updated', project });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * DELETE /api/projects/:id (admin only — soft delete)
 */
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.deletedAt = new Date();
    project.deletedBy = req.user.id;
    project.status = 'archived';
    await project.save();

    await logActivity({
      req,
      action: 'project_archived',
      entityType: 'project',
      entityId: project.id,
      entityName: project.name,
      projectId: project.id,
    });

    res.json({ message: 'Project archived' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};