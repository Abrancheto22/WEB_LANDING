// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server', // Habilita el modo servidor
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind()],
  server: {
    port: 4321,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  },
  // El middleware se carga automáticamente desde src/middleware/
});