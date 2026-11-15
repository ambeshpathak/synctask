const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/permissions');
const projectController = require('../controllers/projectController');

const router = express.Router();
router.use(protect);

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  startDate: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
});

router.post('/', isAdmin, validate(createSchema), projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.put('/:id', isAdmin, validate(updateSchema), projectController.updateProject);
router.delete('/:id', isAdmin, projectController.deleteProject);

module.exports = router;