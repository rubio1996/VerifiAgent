const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

if (!authController) {
  throw new Error("No se pudo cargar authController. Revisa la ruta en src/routes/auth.js");
}

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);

module.exports = router;