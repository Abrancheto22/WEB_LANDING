import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de WhatsApp Business
const WHATSAPP_CONFIG = {
  // Reemplaza con tus credenciales
  PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  API_VERSION: 'v17.0',
  TEMPLATE_NAME: 'confirmacion_pago', // Nombre de tu plantilla aprobada
};

// Configuración de CORS
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta donde se guardarán temporalmente los comprobantes
const TEMP_UPLOADS_DIR = path.join(process.cwd(), 'public', 'temp-uploads');

// Asegurarse de que el directorio existe
await fs.mkdir(TEMP_UPLOADS_DIR, { recursive: true });

// Función para enviar mensaje a través de WhatsApp Business API
async function enviarMensajeWhatsApp(
  telefono: string,
  mensaje: string,
  comprobanteUrl: string = ''
) {
  const url = `https://graph.facebook.com/${WHATSAPP_CONFIG.API_VERSION}/${WHATSAPP_CONFIG.PHONE_NUMBER_ID}/messages`;
  
  // Si hay un comprobante, enviar como mensaje con imagen
  if (comprobanteUrl) {
    // Primero subir la imagen a los medios de WhatsApp
    const mediaResponse = await fetch(
      `https://graph.facebook.com/${WHATSAPP_CONFIG.API_VERSION}/${WHATSAPP_CONFIG.PHONE_NUMBER_ID}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          type: 'image/png',
          link: new URL(comprobanteUrl, process.env.SITE_URL || 'http://localhost:4321').toString()
        })
      }
    );
    
    const mediaData = await mediaResponse.json();
    
    if (!mediaData.id) {
      throw new Error('Error al cargar el comprobante en WhatsApp');
    }
    
    // Enviar mensaje con la imagen
    const messageResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'image',
        image: {
          id: mediaData.id,
          caption: mensaje
        }
      })
    });
    
    return messageResponse.json();
  } else {
    // Enviar solo mensaje de texto
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: telefono,
        type: 'text',
        text: { body: mensaje }
      })
    });
    
    return response.json();
  }
}

// Manejar solicitudes OPTIONS para CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: cors
  });
};

export const POST: APIRoute = async ({ request }) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...cors
  });
  
  try {
    // Verificar credenciales
    if (!WHATSAPP_CONFIG.PHONE_NUMBER_ID || !WHATSAPP_CONFIG.ACCESS_TOKEN) {
      throw new Error('Configuración de WhatsApp no válida');
    }
    
    // Verificar el Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Content-Type no soportado' }),
        { status: 400, headers }
      );
    }
    
    // Parsear los datos del formulario
    const formData = await request.formData();
    const telefono = formData.get('telefono')?.toString() || '';
    const curso = formData.get('curso')?.toString() || '';
    const monto = formData.get('precio')?.toString() || '';
    const nombre = formData.get('nombre')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const metodoPago = formData.get('metodoPago')?.toString() || '';
    const comprobanteFile = formData.get('comprobante');
    
    // Validar datos requeridos
    if (!telefono || !curso || !monto || !nombre) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Faltan campos requeridos en el formulario',
          missingFields: {
            telefono: !telefono,
            curso: !curso,
            monto: !monto,
            nombre: !nombre
          }
        }),
        { status: 400, headers }
      );
    }
    
    // Validar formato de teléfono (solo números, mínimo 8 dígitos)
    const telefonoLimpio = telefono.replace(/\D/g, '');
    if (telefonoLimpio.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'El número de teléfono no es válido',
          field: 'telefono'
        }),
        { status: 400, headers }
      );
    }
    
    // Procesar el comprobante si existe
    let rutaComprobante = '';
    let nombreArchivoComprobante = '';
    
    if (comprobanteFile && comprobanteFile instanceof File && comprobanteFile.size > 0) {
      try {
        // Generar un nombre único para el archivo
        const extension = comprobanteFile.name.split('.').pop() || 'png';
        nombreArchivoComprobante = `comprobante-${Date.now()}.${extension}`;
        const rutaCompleta = path.join(TEMP_UPLOADS_DIR, nombreArchivoComprobante);
        
        // Guardar el archivo temporalmente
        const arrayBuffer = await comprobanteFile.arrayBuffer();
        await fs.writeFile(rutaCompleta, Buffer.from(arrayBuffer));
        
        rutaComprobante = `/temp-uploads/${nombreArchivoComprobante}`;
      } catch (error) {
        console.error('Error al guardar el comprobante:', error);
        throw new Error('Error al procesar el comprobante');
      }
    }
    
    // Crear mensaje de confirmación
    const mensajeConfirmacion = `*¡Gracias por tu compra, ${nombre}!*\n\n` +
      `*Curso:* ${curso}\n` +
      `*Monto:* $${monto}\n` +
      `*Método de pago:* ${metodoPago === 'deposito' ? 'Depósito Bancario' : 'Pago Móvil'}\n\n` +
      `Hemos recibido tu pago correctamente. En breve nos pondremos en contacto contigo para darte acceso al curso.`;
    
    // Enviar mensaje por WhatsApp
    const resultado = await enviarMensajeWhatsApp(
      `51${telefonoLimpio}`, // Asumiendo código de país +51 para Perú
      mensajeConfirmacion,
      rutaComprobante
    );
    
    // Opcional: Enviar notificación al administrador
    if (process.env.ADMIN_PHONE) {
      const mensajeAdmin = `*Nuevo pago recibido*\n\n` +
        `*Curso:* ${curso}\n` +
        `*Monto:* $${monto}\n` +
        `*Método:* ${metodoPago}\n` +
        `*Cliente:* ${nombre}\n` +
        `*Teléfono:* ${telefonoLimpio}\n` +
        `*Email:* ${email || 'No proporcionado'}`;
      
      await enviarMensajeWhatsApp(
        process.env.ADMIN_PHONE,
        mensajeAdmin,
        rutaComprobante
      );
    }
    
    // Limpiar archivos temporales después de 1 hora
    if (nombreArchivoComprobante) {
      setTimeout(async () => {
        try {
          await fs.unlink(path.join(TEMP_UPLOADS_DIR, nombreArchivoComprobante));
        } catch (error) {
          console.error('Error al eliminar archivo temporal:', error);
        }
      }, 3600000); // 1 hora en milisegundos
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Pago registrado con éxito! Te enviaremos un mensaje por WhatsApp.',
        data: {
          telefono: telefonoLimpio,
          curso,
          monto,
          metodoPago,
          comprobante: rutaComprobante || null
        }
      }),
      { status: 200, headers }
    );
    
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al procesar el pago. Por favor, inténtalo de nuevo.',
        error: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { status: 500, headers }
    );
  }
};
