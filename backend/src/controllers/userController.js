const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

// Registro de usuario
const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validamos si el usuario ya existe
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "El correo ya está registrado" });
        }

        // Cifrado de contraseña (Bcrypt Factor 12 como planeamos)
        const hashedPassword = await bcrypt.hash(password, 12);

        // Crear usuario en Supabase a través de Prisma
        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                gdprConsentAt: new Date(),
                role: 'USER'
            }
        });

        res.status(201).json({ message: "Usuario creado con éxito", userId: newUser.id });
    } catch (error) {
        console.error("Error in user register:", error);
        res.status(500).json({ error: "Error en el registro de usuario" });
    }
};

module.exports = { register };