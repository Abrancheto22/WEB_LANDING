export const onRequest = async (context) => {
  // Agregar headers CORS
  context.response.headers.append('Access-Control-Allow-Origin', 'http://localhost:4321');
  context.response.headers.append('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  context.response.headers.append('Access-Control-Allow-Headers', 'Content-Type');
  context.response.headers.append('Access-Control-Allow-Credentials', 'true');

  // Manejar preflight OPTIONS
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  return context.next();
};
