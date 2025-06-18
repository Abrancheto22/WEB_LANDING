// Configuración del servidor de correo
const emailConfig = {
  host: 'smtp.gmail.com', // Servidor SMTP de Gmail
  port: 587, // Puerto seguro para Gmail
  secure: false, // true para el puerto 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER, // Tu correo de Gmail
    pass: process.env.EMAIL_PASS, // Tu contraseña de aplicación de Gmail
  },
  from: `"${process.env.EMAIL_NAME || 'Sistema de Pagos'}" <${process.env.EMAIL_USER}>`,
};

export default emailConfig;
