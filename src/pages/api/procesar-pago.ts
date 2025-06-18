import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendPaymentConfirmationEmail } from '../../lib/sendEmail';

// Cargar variables de entorno
const EMAIL_DESTINATION = process.env.EMAIL_DESTINATION || '';

// Configuración de CORS
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta donde se guardarán los comprobantes
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'comprobantes');

// Asegurarse de que el directorio existe
await fs.mkdir(UPLOADS_DIR, { recursive: true });

// Función para guardar la imagen del comprobante
async function guardarComprobante(imagenData: any, nombreArchivo: string): Promise<string> {
  try {
    console.log('Tipo de imagen recibida:', typeof imagenData);
    
    // Si es un objeto File, convertirlo a base64
    if (imagenData instanceof File) {
      console.log('Convirtiendo File a base64...');
      const arrayBuffer = await imagenData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      
      // Obtener la extensión del archivo
      const extension = imagenData.name ? imagenData.name.split('.').pop() || 'png' : 'png';
      const nombreArchivoCompleto = `${nombreArchivo}.${extension}`;
      const rutaCompleta = path.join(UPLOADS_DIR, nombreArchivoCompleto);
      
      // Guardar el archivo
      await fs.writeFile(rutaCompleta, base64Data, 'base64');
      return `/uploads/comprobantes/${nombreArchivoCompleto}`;
    }
    
    // Si es un Blob (sin nombre de archivo)
    if (imagenData instanceof Blob) {
      console.log('Convirtiendo Blob a base64...');
      const arrayBuffer = await imagenData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      
      // Usar extensión png por defecto para Blob
      const nombreArchivoCompleto = `${nombreArchivo}.png`;
      const rutaCompleta = path.join(UPLOADS_DIR, nombreArchivoCompleto);
      
      // Guardar el archivo
      await fs.writeFile(rutaCompleta, base64Data, 'base64');
      return `/uploads/comprobantes/${nombreArchivoCompleto}`;
    }
    
    // Si ya es un string base64
    if (typeof imagenData === 'string') {
      console.log('Procesando como string base64...');
      // Intentar extraer datos base64
      const base64Match = imagenData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (base64Match && base64Match[2]) {
        const extension = base64Match[1].split('/')[1] || 'png';
        const nombreArchivoCompleto = `${nombreArchivo}.${extension}`;
        const rutaCompleta = path.join(UPLOADS_DIR, nombreArchivoCompleto);
        
        await fs.writeFile(rutaCompleta, base64Match[2], 'base64');
        return `/uploads/comprobantes/${nombreArchivoCompleto}`;
      } else if (imagenData.startsWith('/9j/') || imagenData.startsWith('iVBOR')) {
        // Si parece ser un base64 sin prefijo data:image/...
        const extension = imagenData.startsWith('/9j/') ? 'jpg' : 'png';
        const nombreArchivoCompleto = `${nombreArchivo}.${extension}`;
        const rutaCompleta = path.join(UPLOADS_DIR, nombreArchivoCompleto);
        
        await fs.writeFile(rutaCompleta, imagenData, 'base64');
        return `/uploads/comprobantes/${nombreArchivoCompleto}`;
      }
    }
    
    // Si es un buffer
    if (Buffer.isBuffer(imagenData)) {
      console.log('Procesando como Buffer...');
      const extension = 'png'; // Asumir PNG por defecto
      const nombreArchivoCompleto = `${nombreArchivo}.${extension}`;
      const rutaCompleta = path.join(UPLOADS_DIR, nombreArchivoCompleto);
      
      await fs.writeFile(rutaCompleta, imagenData);
      return `/uploads/comprobantes/${nombreArchivoCompleto}`;
    }
    
    throw new Error('Formato de imagen no soportado');
    
  } catch (error: unknown) {
    console.error('Error detallado al guardar el comprobante:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al guardar la imagen';
    throw new Error(`Error al guardar la imagen: ${errorMessage}`);
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
  // Configurar headers CORS
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...cors
  });
  
  try {
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
    const datos: Record<string, string> = {};
    
    // Convertir FormData a objeto plano, asegurando que los valores sean strings
    for (const [key, value] of formData.entries()) {
      datos[key] = value.toString();
    }
    
    // Validar datos requeridos
    if (!datos.curso || !datos.precio || !datos.nombre || !datos.email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Faltan campos requeridos en el formulario',
          missingFields: {
            curso: !datos.curso,
            precio: !datos.precio,
            nombre: !datos.nombre,
            email: !datos.email
          }
        }),
        { status: 400, headers }
      );
    }
    
    // Procesar el comprobante si existe
    let rutaComprobante = '';
    const comprobanteFile = formData.get('comprobante');
    
    if (comprobanteFile && comprobanteFile instanceof File) {
      try {
        // Generar un nombre único para el archivo
        const nombreArchivo = `comprobante-${Date.now()}`;
        
        // Leer el archivo como buffer
        const arrayBuffer = await comprobanteFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Guardar el comprobante
        rutaComprobante = await guardarComprobante(buffer, nombreArchivo);
      } catch (error) {
        console.error('Error al guardar el comprobante:', error);
        // Continuar sin el comprobante
      }
    } else if (typeof comprobanteFile === 'string' && comprobanteFile.startsWith('data:image')) {
      try {
        // Si es un string base64
        const nombreArchivo = `comprobante-${Date.now()}.png`;
        rutaComprobante = await guardarComprobante(comprobanteFile, nombreArchivo);
      } catch (error) {
        console.error('Error al guardar el comprobante (base64):', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Error al procesar el comprobante',
            error: error instanceof Error ? error.message : 'Error desconocido'
          }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Crear objeto con los datos del pago
    const pagoRegistrado = {
      ...datos,
      fecha: new Date().toISOString(),
      comprobante: rutaComprobante
    };
    
    // Aquí iría la lógica para guardar en la base de datos
    console.log('Pago registrado:', {
      ...pagoRegistrado,
      comprobante: pagoRegistrado.comprobante ? '✅ Guardado' : '❌ No proporcionado'
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pago registrado exitosamente',
        data: pagoRegistrado
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

        // Enviar correo de confirmación
    try {
      await sendPaymentConfirmationEmail(
        EMAIL_DESTINATION, // Correo del administrador
        datos.nombre,
        datos.curso,
        datos.precio,
        rutaComprobante
      );

      // Si el usuario proporcionó un correo diferente, enviar copia al usuario
      if (datos.email && datos.email !== EMAIL_DESTINATION) {
        await sendPaymentConfirmationEmail(
          datos.email,
          datos.nombre,
          datos.curso,
          datos.precio,
          rutaComprobante
        );
      }
      
      // Manejar la respuesta exitosa
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pago registrado exitosamente. Se ha enviado una confirmación por correo electrónico.',
          data: {
            ...pagoRegistrado,
            comprobante: pagoRegistrado.comprobante ? '✅ Recibido' : '❌ No proporcionado'
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
      
    } catch (emailError) {
      console.error('Error al enviar el correo:', emailError);
      
      // Retornar éxito pero con advertencia de que no se pudo enviar el correo
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pago registrado exitosamente, pero no se pudo enviar el correo de confirmación.',
          data: {
            ...pagoRegistrado,
            comprobante: pagoRegistrado.comprobante ? '✅ Recibido' : '❌ No proporcionado',
            emailWarning: 'No se pudo enviar el correo de confirmación'
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...cors
          }
        }
      );
    }
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    console.error('Error en el servidor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error interno del servidor',
        error: errorMessage
      }),
      { status: 500, headers }
    );
  }
};
