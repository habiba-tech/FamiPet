const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAllUsers, getUserById, toggleFavorite, uploadAvatar } = require('../controllers/user.controller');
const upload = require('../middleware/upload');

router.get('/', protect, adminOnly, getAllUsers);
router.get('/:id', protect, getUserById);
router.post('/favorites/:petId', protect, toggleFavorite);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
