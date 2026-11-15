const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  designation: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  designation: z.string().optional(),
  avatar: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.me);
router.put('/me', protect, validate(updateProfileSchema), authController.updateProfile);
router.put('/me/password', protect, validate(changePasswordSchema), authController.changePassword);

module.exports = router;