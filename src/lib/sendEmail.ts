import nodemailer from 'nodemailer';
import emailConfig from './emailConfig';
import path from 'path';
import fs from 'fs/promises';

export async function sendPaymentConfirmationEmail(
  to: string,
  nombre: string,
  curso: string,
  precio: string,
  comprobantePath?: string
) {
  try {
    // Crear un transportador reutilizable
    const transporter = nodemailer.createTransport(emailConfig);

    // Leer la plantilla HTML
    const templatePath = path.join(process.cwd(), 'src', 'emails', 'payment-confirmation.html');
    let htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    
    // Reemplazar variables en la plantilla
    htmlTemplate = htmlTemplate
      .replace(/{{nombre}}/g, nombre)
      .replace(/{{curso}}/g, curso)
      .replace(/{{precio}}/g, precio);

    // Configuración del correo
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject: `Confirmación de pago - ${curso}`,
      html: htmlTemplate,
      attachments: [] as any[],
    };

    // Adjuntar comprobante si existe
    if (comprobantePath) {
      const fullPath = path.join(process.cwd(), 'public', comprobantePath);
      try {
        await fs.access(fullPath);
        mailOptions.attachments.push({
          filename: 'comprobante-pago.png',
          path: fullPath,
          cid: 'comprobante'
        });
      } catch (error) {
        console.warn('No se pudo adjuntar el comprobante:', error);
      }
    }

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw new Error('No se pudo enviar el correo de confirmación');
  }
}
