import { sendEmail } from '../../utils/email';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Leer el cuerpo como JSON
    const data = await request.json();

    // Validar que todos los campos requeridos estén presentes
    const requiredFields = ['nombre', 'email', 'telefono', 'metodoPago', 'curso', 'precio'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos', missing: missingFields }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Preparar el contenido del correo
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1e40af; text-align: center;">Boleta de Compra</h2>
        
        <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
          <h3>Detalles del Curso</h3>
          <p><strong>Curso:</strong> ${data.curso}</p>
          <p><strong>Precio:</strong> $${data.precio}</p>
        </div>

        <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
          <h3>Información del Cliente</h3>
          <p><strong>Nombre:</strong> ${data.nombre}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Teléfono:</strong> ${data.telefono}</p>
        </div>

        <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
          <h3>Método de Pago</h3>
          <p><strong>Método:</strong> ${data.metodoPago}</p>
          ${data.banco ? `<p><strong>Banco:</strong> ${data.banco}</p>` : ''}
          ${data.numeroCuenta ? `<p><strong>Número de Cuenta:</strong> ${data.numeroCuenta}</p>` : ''}
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666;">Gracias por tu compra!</p>
        </div>
      </div>
    `;

    // Enviar el correo
    await sendEmail({
      to: data.email,
      subject: 'Boleta de Compra - Curso Adquirido',
      html: emailContent
    });

    return new Response(JSON.stringify({ success: true, message: 'Boleta enviada exitosamente' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return new Response(JSON.stringify({ error: 'Error al enviar el correo', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
