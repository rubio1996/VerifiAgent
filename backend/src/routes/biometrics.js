const express = require('express');
const router = express.Router();
const biometricsController = require('../controllers/biometricsController');

router.post('/verify', biometricsController.verify);

module.exports = router;
