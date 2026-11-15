const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdmin, isGroupLeaderOrAdmin, isGroupMember } = require('../middleware/permissions');
const groupController = require('../controllers/groupController');

const router = express.Router();

router.use(protect); // sab routes auth

// Schemas
const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  projectId: z.string().uuid().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['leader', 'member']).optional(),
});

const roleSchema = z.object({
  role: z.enum(['leader', 'member']),
});

const transferSchema = z.object({
  toGroupId: z.string().uuid(),
  reason: z.string().optional(),
});

const removeSchema = z.object({
  reason: z.string().optional(),
  reassignTo: z.string().uuid().optional(),
});

const replaceSchema = z.object({
  newUserId: z.string().uuid(),
  reassignTasks: z.boolean().optional(),
  reason: z.string().optional(),
});

// Group CRUD
router.post('/', isAdmin, validate(createSchema), groupController.createGroup);
router.get('/', groupController.getGroups);
router.get('/:id', groupController.getGroupById);
router.put('/:id', isGroupLeaderOrAdmin('id'), validate(updateSchema), groupController.updateGroup);
router.delete('/:id', isAdmin, groupController.deleteGroup);

// Members
router.get('/:id/members', isGroupMember('id'), groupController.getMembers);
router.post('/:id/members', isGroupLeaderOrAdmin('id'), validate(addMemberSchema), groupController.addMember);
router.put('/:id/members/:userId/role', isAdmin, validate(roleSchema), groupController.changeMemberRole);
router.post('/:id/members/:userId/transfer', isGroupLeaderOrAdmin('id'), validate(transferSchema), groupController.transferMember);
router.post('/:id/members/:userId/remove', isGroupLeaderOrAdmin('id'), validate(removeSchema), groupController.removeMember);
router.post('/:id/members/:userId/replace', isGroupLeaderOrAdmin('id'), validate(replaceSchema), groupController.replaceMember);
router.get('/:id/members/:userId/history', groupController.getMemberHistory);

module.exports = router;