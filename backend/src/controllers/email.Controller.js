import { sendEmail } from '../services/emailService.js';

export const sendTestEmail = async (req, res) => {
  try {
    const { to, name } = req.body;

    if (!to) {
      return res.status(400).json({ message: 'Falta el email de destino' });
    }

    await sendEmail({
      to,
      subject: 'Bienvenido a VerifID',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Hola ${name || 'usuario'}</h2>
          <p>Tu cuenta se ha creado correctamente.</p>
          <p>Ya puedes empezar a usar VerifID.</p>
        </div>
      `,
      text: `Hola ${name || 'usuario'}, tu cuenta se ha creado correctamente.`,
    });

    return res.status(200).json({ message: 'Email enviado correctamente' });
  } catch (error) {
    return res.status(500).json({
      message: 'Error enviando email',
      error: error.message,
    });
  }
};