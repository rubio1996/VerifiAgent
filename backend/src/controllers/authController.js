const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// ── Utilidad: normaliza siempre el email antes de usarlo ─────────────────────
const normalizeEmail = (email = '') => email.toLowerCase().trim();

// ── Registro ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { email: rawEmail, password, gdpr_consent } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!gdpr_consent) {
      return res.status(400).json({ error: 'Debes aceptar el consentimiento GDPR para continuar.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        gdprConsentAt: new Date(),
        role: 'USER',
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret_temporal_123',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = normalizeEmail(rawEmail);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret_temporal_123',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el inicio de sesión.' });
  }
};

// ── Restablecer contraseña ────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email: rawEmail, newPassword } = req.body;
    const email = normalizeEmail(rawEmail);

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email y nueva contraseña son obligatorios.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Respuesta genérica para no revelar si el email existe
      return res.status(200).json({ message: 'Si el email está registrado, la contraseña ha sido actualizada.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
    });

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = { register, login, resetPassword };