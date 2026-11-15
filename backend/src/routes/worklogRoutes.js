const express = require('express');
const { protect } = require('../middleware/auth');
const worklogController = require('../controllers/worklogController');

const router = express.Router();
router.use(protect);

router.get('/me', worklogController.getMyWorkLogs);

module.exports = router;