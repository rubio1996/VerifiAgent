const jwt = require('jsonwebtoken');

/**
 * Middleware de protección de rutas (RNF-01)
 *
 * Verifica el token JWT antes de permitir el acceso a rutas protegidas.
 * Distingue entre token expirado y token inválido para logs y respuestas claras.
 *
 * Errores posibles:
 *  - 401 TokenExpiredError  → el token es válido pero ha caducado
 *  - 401 JsonWebTokenError  → firma incorrecta, token malformado o manipulado
 *  - 401 NotBeforeError     → el token aún no es válido (nbf claim)
 *  - 401 sin token          → cabecera Authorization ausente o mal formada
 */
const protect = (req, res, next) => {
  // ── 1. Extraer el token de la cabecera Authorization ─────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No autorizado: no se proporcionó un token de acceso.',
      code:  'NO_TOKEN',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'No autorizado: el token está vacío.',
      code:  'EMPTY_TOKEN',
    });
  }

  // ── 2. Verificar y decodificar el token ──────────────────────────────────
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, role, iat, exp }
    next();

  } catch (error) {

    // Token expirado (el más común en producción)
    if (error.name === 'TokenExpiredError') {
      console.warn(`[AUTH] Token expirado para petición a ${req.path}. Expiró: ${error.expiredAt}`);
      return res.status(401).json({
        error:   'La sesión ha expirado. Inicia sesión de nuevo.',
        code:    'TOKEN_EXPIRED',
        expiredAt: error.expiredAt,
      });
    }

    // Token con firma inválida o manipulado
    if (error.name === 'JsonWebTokenError') {
      console.error(`[AUTH] Token inválido para petición a ${req.path}: ${error.message}`);
      return res.status(401).json({
        error: 'Token de acceso inválido.',
        code:  'INVALID_TOKEN',
      });
    }

    // Token con claim nbf (not before) — todavía no válido
    if (error.name === 'NotBeforeError') {
      console.warn(`[AUTH] Token aún no válido (nbf) para petición a ${req.path}.`);
      return res.status(401).json({
        error: 'El token de acceso aún no es válido.',
        code:  'TOKEN_NOT_ACTIVE',
      });
    }

    // Error inesperado
    console.error(`[AUTH] Error inesperado verificando token en ${req.path}:`, error);
    return res.status(401).json({
      error: 'Error de autenticación. Inicia sesión de nuevo.',
      code:  'AUTH_ERROR',
    });
  }
};

module.exports = { protect };