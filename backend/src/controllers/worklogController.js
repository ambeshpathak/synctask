const WorkLog = require('../models/WorkLog');
const Task = require('../models/Task');
const User = require('../models/User');
const GroupMember = require('../models/GroupMember');

/**
 * GET /api/tasks/:taskId/worklogs
 */
exports.getTaskWorkLogs = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'admin') {
      const m = await GroupMember.findOne({
        where: { groupId: task.groupId, userId: req.user.id, status: 'active' },
      });
      if (!m) return res.status(403).json({ message: 'Access denied' });
      if (m.role !== 'leader' && task.assignedTo !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const workLogs = await WorkLog.findAll({
      where: { taskId: task.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'designation'] }],
      order: [['startedAt', 'DESC']],
    });

    const totalMinutes = workLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

    res.json({ workLogs, totalMinutes });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/worklogs/me
 */
exports.getMyWorkLogs = async (req, res) => {
  try {
    const workLogs = await WorkLog.findAll({
      where: { userId: req.user.id },
      include: [{ model: Task, as: 'task', attributes: ['id', 'title', 'status'] }],
      order: [['startedAt', 'DESC']],
      limit: 100,
    });

    const totalMinutes = workLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

    res.json({ workLogs, totalMinutes });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};