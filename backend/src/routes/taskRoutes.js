const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const taskController = require('../controllers/taskController');
const worklogController = require('../controllers/worklogController');
const router = express.Router();

router.use(protect);

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  groupId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().positive().nullable().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  deadline: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().positive().nullable().optional(),
});

const transferSchema = z.object({
  toUserId: z.string().uuid(),
  reason: z.string().optional(),
});

router.post('/', validate(createSchema), taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/deleted', taskController.getDeletedTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', validate(updateSchema), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.post('/:id/restore', taskController.restoreTask);
router.post('/:id/transfer', validate(transferSchema), taskController.transferTask);
router.post('/:id/start', taskController.startTask);
router.post('/:id/pause', taskController.pauseTask);
router.post('/:id/complete', taskController.completeTask);
router.get('/:id/history', taskController.getTaskHistory);
router.get('/:taskId/worklogs', worklogController.getTaskWorkLogs);
module.exports = router;