FROM node:20-alpine

# Instalar dependencias globales
RUN npm install -g supergateway@2

WORKDIR /app

# Instalar clickup-mcp localmente
RUN npm init -y && npm install @hauptsache.net/clickup-mcp

# Variables de entorno (configurar en Dockploy)
ENV CLICKUP_API_KEY=""
ENV CLICKUP_TEAM_ID=""
ENV CLICKUP_MCP_MODE="write"
ENV PORT=3231

EXPOSE 3231

# supergateway convierte STDIO → HTTP SSE
CMD ["npx", "supergateway", "--sse", "--port", "3231", "--baseUrl", "http://0.0.0.0:3231", "--stdio", "node", "node_modules/@hauptsache.net/clickup-mcp/dist/index.js"]
