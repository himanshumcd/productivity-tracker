// predictions.js
const express = require('express');
const router = express.Router();
const { analyze, getPatterns } = require('../controllers/predictionsController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/analyze', analyze);
router.get('/patterns', getPatterns);

module.exports = router;
