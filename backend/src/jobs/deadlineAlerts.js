const cron = require('node-cron');
const { Op } = require('sequelize');
const Task = require('../models/Task');
const GroupMember = require('../models/GroupMember');
const Alert = require('../models/Alert');
const { getIO } = require('../sockets');
const sendNotification = require('../utils/sendNotification');

/**
 * Har ghante check karo:
 * 1. Deadline 24h pehle → alert
 * 2. Overdue → alert
 */
const startCronJobs = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Cron: Checking deadlines...');
    const io = getIO();
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      // ============ 1. Deadline approaching (24h) ============
      const approaching = await Task.findAll({
        where: {
          status: { [Op.ne]: 'done' },
          deletedAt: null,
          deadline: { [Op.between]: [now, in24h] },
        },
      });

      for (const task of approaching) {
        // Duplicate alert avoid karo (same task same user same type last 24h)
        const existing = await Alert.findOne({
          where: {
            userId: task.assignedTo,
            taskId: task.id,
            type: 'deadline_approaching',
            createdAt: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });
        if (existing || !task.assignedTo) continue;

        const alert = await Alert.create({
          userId: task.assignedTo,
          taskId: task.id,
          type: 'deadline_approaching',
          message: `Deadline in 24h: "${task.title}". Complete now!`,
        });

        if (io) {
          io.to(`user:${task.assignedTo}`).emit('alert:new', alert);
        }

        await sendNotification(io, {
          userId: task.assignedTo,
          type: 'deadline_approaching',
          title: '⏰ Deadline approaching',
          message: `"${task.title}" deadline in 24 hours`,
          link: `/tasks/${task.id}`,
          entityType: 'task',
          entityId: task.id,
        });
      }

      // ============ 2. Overdue ============
      const overdue = await Task.findAll({
        where: {
          status: { [Op.ne]: 'done' },
          deletedAt: null,
          deadline: { [Op.lt]: now },
        },
      });

      for (const task of overdue) {
        const existing = await Alert.findOne({
          where: {
            userId: task.assignedTo,
            taskId: task.id,
            type: 'overdue',
            createdAt: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        });
        if (existing || !task.assignedTo) continue;

        const alert = await Alert.create({
          userId: task.assignedTo,
          taskId: task.id,
          type: 'overdue',
          message: `OVERDUE: "${task.title}" — complete ASAP!`,
        });

        if (io) {
          io.to(`user:${task.assignedTo}`).emit('alert:new', alert);
          io.to(`group:${task.groupId}`).emit('task:overdue', {
            taskId: task.id,
            userId: task.assignedTo,
          });
        }

        // Leader ko bhi
        const leaders = await GroupMember.findAll({
          where: { groupId: task.groupId, role: 'leader', status: 'active' },
        });
        for (const l of leaders) {
          await sendNotification(io, {
            userId: l.userId,
            type: 'task_overdue',
            title: '🔴 Task overdue',
            message: `"${task.title}" is overdue`,
            link: `/tasks/${task.id}`,
            entityType: 'task',
            entityId: task.id,
          });
        }
      }

      console.log(`⏰ Cron: ${approaching.length} approaching, ${overdue.length} overdue`);
    } catch (err) {
      console.error('Cron error:', err.message);
    }
  });

  console.log('✅ Cron jobs scheduled');
};

module.exports = { startCronJobs };