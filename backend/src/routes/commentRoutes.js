const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const commentController = require('../controllers/commentController');

const router = express.Router();
router.use(protect);

const createSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['task', 'group_broadcast', 'private']),
  groupId: z.string().uuid(),
  taskId: z.string().uuid().nullable().optional(),
  recipientId: z.string().uuid().nullable().optional(),
});

router.post('/', validate(createSchema), commentController.createComment);
router.get('/task/:taskId', commentController.getTaskComments);
router.get('/group/:groupId', commentController.getGroupComments);
router.get('/inbox', commentController.getInbox);
router.get('/sent', commentController.getSent);
router.delete('/:id', commentController.deleteComment);

module.exports = router;