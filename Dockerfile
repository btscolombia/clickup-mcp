FROM supercorp/supergateway:latest

# Install clickup-mcp in a proper location with all dependencies
WORKDIR /mcp
RUN npm init -y && npm install @hauptsache.net/clickup-mcp

ENV CLICKUP_API_KEY=""
ENV CLICKUP_TEAM_ID=""
ENV CLICKUP_MCP_MODE="write"

EXPOSE 3231

CMD ["--stdio", "node /mcp/node_modules/@hauptsache.net/clickup-mcp/dist/index.js", "--port", "3231", "--baseUrl", "http://0.0.0.0:3231"]
