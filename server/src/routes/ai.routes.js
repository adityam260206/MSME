const express = require('express');
const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/v1/ai/chat
 * @desc    Send a message to AI HelpBot
 * @access  Private
 */
router.post('/chat', protect, aiController.chat);

module.exports = router;
