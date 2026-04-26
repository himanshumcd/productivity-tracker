const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/message', sendMessage);

module.exports = router;
