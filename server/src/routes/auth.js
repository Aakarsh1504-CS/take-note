const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const ctrl = require('../controllers/authController');

const router = Router();

router.post(
  '/register',
  authLimiter,
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('name').isString().trim().isLength({ min: 1, max: 80 }).withMessage('Name is required'),
  body('password').isString().isLength({ min: 8, max: 200 }).withMessage('Password must be 8+ characters'),
  validate,
  ctrl.register
);

router.post(
  '/login',
  authLimiter,
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
  ctrl.login
);

router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
