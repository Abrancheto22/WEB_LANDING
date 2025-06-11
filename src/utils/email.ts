import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Verificar que las variables de entorno estén configuradas
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error('Las variables de entorno EMAIL_USER y EMAIL_PASS deben estar configuradas');
}

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });

    console.log('Correo enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    throw error;
  }
}
