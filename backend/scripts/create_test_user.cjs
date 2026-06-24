#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

(async () => {
  try {
    const email = process.argv[2] || 'test@example.com';
    const password = process.argv[3] || 'Password123!';

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hashed, gdprConsentAt: new Date() },
      create: {
        email,
        passwordHash: hashed,
        role: 'USER',
        gdprConsentAt: new Date(),
      },
    });

    console.log('Usuario creado/actualizado:');
    console.log('  id   :', user.id);
    console.log('  email:', user.email);
    console.log('  pass :', password);
    process.exit(0);
  } catch (err) {
    console.error('Error creando usuario:', err);
    process.exit(1);
  }
})();
