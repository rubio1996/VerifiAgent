const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController'); // Importamos el controlador

// Tu ruta de admin vinculada a las estadísticas de riesgo (Fase 4)
router.get('/', adminController.getDashboardStats);

module.exports = router;