const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/noteController');

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.list);

router.post(
  '/',
  body('title').isString().trim().isLength({ min: 1, max: 80 }).withMessage('Title is required (1-80 chars)'),
  body('content').optional().isString().isLength({ max: 10_000 }).withMessage('Content too long'),
  validate,
  ctrl.create
);

router.get('/:id', ctrl.getOne);

router.patch(
  '/:id',
  body('title').optional().isString().trim().isLength({ min: 1, max: 80 }).withMessage('Title must be 1-80 chars'),
  body('content').optional().isString().isLength({ max: 10_000 }).withMessage('Content too long'),
  validate,
  ctrl.update
);

router.delete('/:id', ctrl.remove);

module.exports = router;
