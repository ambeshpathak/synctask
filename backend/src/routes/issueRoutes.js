const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const issueController = require('../controllers/issueController');

const router = express.Router();
router.use(protect);

const raiseSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(['task', 'project', 'blocking', 'general']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  projectId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
});

const assignSchema = z.object({
  assignedTo: z.string().uuid(),
});

const resolveSchema = z.object({
  resolutionNote: z.string().optional(),
});

const commentSchema = z.object({
  content: z.string().min(1),
});

router.post('/', validate(raiseSchema), issueController.raiseIssue);
router.get('/', issueController.getIssues);
router.get('/:id', issueController.getIssueById);
router.post('/:id/assign', validate(assignSchema), issueController.assignIssue);
router.post('/:id/resolve', validate(resolveSchema), issueController.resolveIssue);
router.post('/:id/close', issueController.closeIssue);
router.post('/:id/reopen', issueController.reopenIssue);
router.post('/:id/comments', validate(commentSchema), issueController.addComment);

module.exports = router;