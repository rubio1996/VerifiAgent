const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // Importamos el controlador


// Tu ruta de perfil (Actualizada)
router.get('/profile', (req, res) => res.json({ message: "User profile" }));

module.exports = router;