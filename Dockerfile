# Usa la versión exacta de Node requerida por Astro
FROM node:18.20.8

# Crea una carpeta de trabajo
WORKDIR /app

# Copia los archivos del proyecto
COPY . .

# Instala dependencias
RUN npm install

# Construye el sitio Astro
RUN npm run build

# Expone el puerto (Astro preview por defecto usa 4321, pero Railway necesita 3000)
ENV PORT=3000

# Comando para iniciar en producción
CMD ["npx", "astro", "preview", "--port", "3000", "--host"]
