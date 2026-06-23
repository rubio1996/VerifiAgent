const rateLimit = require('express-rate-limit');

/**
 * Limitador global de peticiones (RNF-01)
 * Protege la API contra ataques de Denegación de Servicio (DoS) 
 * y fuerza bruta en los endpoints de autenticación.
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 100, // Limita cada IP a 100 peticiones por ventana
  standardHeaders: true, // Retorna info del límite en las cabeceras 'RateLimit-*'
  legacyHeaders: false, // Desactiva las cabeceras 'X-RateLimit-*'
  message: {
    status: 429,
    error: 'Demasiadas peticiones. Por favor, inténtalo de nuevo en 15 minutos.'
  }
});

module.exports = { globalLimiter };