const express = require('express');
const router  = express.Router();
const verifyController = require('../controllers/verifyController');
const { protect } = require('../middleware/authMiddleware'); // Usamos 'protect' que es el estándar en tu proyecto
const multer = require('multer');

// Configuración de Multer (RNF-04)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// Rutas protegidas (RF-02)
// Cambiamos 'authMiddleware' por 'protect' para que coincida con tu lógica de JWT
router.post('/start', protect, verifyController.startVerification);
router.post('/:id/document', protect, upload.single('document'), verifyController.uploadDocument);
router.get('/:id/status', protect, verifyController.getStatus);
router.get('/:id/result', protect, verifyController.getResult);
router.get('/:id/report', protect, verifyController.downloadReport);

module.exports = router;