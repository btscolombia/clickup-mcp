FROM supercorp/supergateway:latest

# Install git and build tools
RUN apk add --no-cache git

# Clone our fork with member tools
WORKDIR /mcp
RUN git clone https://github.com/btscolombia/clickup-mcp.git . && \
    npm install && \
    npm run build

ENV CLICKUP_API_KEY=""
ENV CLICKUP_TEAM_ID=""
ENV CLICKUP_MCP_MODE="write"

EXPOSE 3231

CMD ["--stdio", "node /mcp/dist/index.js", "--port", "3231", "--baseUrl", "http://0.0.0.0:3231"]
