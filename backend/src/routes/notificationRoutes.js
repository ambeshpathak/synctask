const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/permissions');
const notificationController = require('../controllers/notificationController');

const router = express.Router();
router.use(protect);

const alertSchema = z.object({
  userId: z.string().uuid(),
  taskId: z.string().uuid().nullable().optional(),
  message: z.string().min(1),
});

router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/:id/read', notificationController.markRead);
router.put('/notifications/read-all', notificationController.markAllRead);
router.get('/notifications/unread-count', notificationController.getUnreadCount);

router.get('/alerts', notificationController.getAlerts);
router.put('/alerts/:id/read', notificationController.markAlertRead);
router.post('/alerts/send', validate(alertSchema), notificationController.sendManualAlert);

module.exports = router;