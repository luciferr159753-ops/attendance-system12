const express = require('express');
const router = express.Router();
const { getAllUsers, assignUser, createUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getAllUsers);
router.post('/', protect, authorize('admin'), createUser);
router.put('/:id/assign', protect, authorize('admin'), assignUser);

module.exports = router;
