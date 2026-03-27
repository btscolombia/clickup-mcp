FROM node:20-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar archivos del proyecto
COPY package*.json ./
COPY src ./src
COPY tsconfig.json ./

# Instalar dependencias y compilar
RUN npm ci && npm run build

# Instalar supergateway para HTTP transport
RUN npm install -g supergateway@3

# Variables de entorno obligatorias
ENV CLICKUP_API_KEY=placeholder
ENV CLICKUP_TEAM_ID=placeholder
ENV CLICKUP_MCP_MODE=write
ENV PORT=3231

EXPOSE 3231

# Ejecutar supergateway (STDIO → HTTP SSE)
CMD ["supergateway", "--sse", "--port", "3231", "--stdio", "node", "dist/index.js"]
