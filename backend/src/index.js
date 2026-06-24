require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

// Rutas
const authRoutes   = require('./routes/auth');
const verifyRoutes = require('./routes/verify');
const adminRoutes  = require('./routes/admin');
const userRoutes   = require('./routes/user');
const emailRoutes  = require('./routes/email');
const biometricsRoutes = require('./routes/biometrics');
const { globalLimiter } = require('./middleware/rateLimiter');

const app  = express();

// --- CAMBIO PERMANENTE ---
const PORT = process.env.PORT || 3001;

// ─── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// ─── Logging y parseo ─────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting global ────────────────────────────────────────────────────
app.use(globalLimiter);

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/admin',  adminRoutes);
app.use('/api/user',   userRoutes);
app.use('/api/email',  emailRoutes);
app.use('/api/biometrics', biometricsRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor en el 3001 funcional' });
});

// ─── Manejo de errores global ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[ERROR] ${status} — ${err.message}`);
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
  });
});

module.exports = app;

// ─── Levantar el servidor forzando IP y Puerto ────────────────────────────────
if (require.main === module) {
  // Escuchamos en 0.0.0.0 para que sea visible en toda la red local
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 PRUEBA TEMPORAL`);
    console.log(`🛡️  Backend activo en: http://127.0.0.1:${PORT}`);
    console.log(`🛡️  Ruta de salud: http://127.0.0.1:${PORT}/health`);
    console.log(`   Esperando peticiones...\n`);
  });

  process.stdin.resume();
}