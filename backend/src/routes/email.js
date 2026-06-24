const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

router.post('/send-test-email', emailController.sendTestEmail);

module.exports = router;