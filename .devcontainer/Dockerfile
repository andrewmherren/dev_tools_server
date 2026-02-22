FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Set environment variables for non-interactive apt
ENV DEBIAN_FRONTEND=noninteractive

# Install base development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    zip \
    ca-certificates \
    build-essential \
    jq \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install global node tools (skip npm@latest upgrade to avoid version conflicts)
RUN npm install -g \
    yarn \
    pnpm

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install MCP and Ollama client (step 2 integration)
RUN pip3 install --no-cache-dir --break-system-packages \
    mcp \
    ollama \
    pyyaml

# Create MCP config directory
RUN mkdir -p /etc/mcp

# Install filesystem MCP server globally
RUN npm install -g @modelcontextprotocol/server-filesystem

# Create directory for MCP template and copy it
RUN mkdir -p /opt/dev_environment
COPY example-vscode/mcp.json /opt/dev_environment/mcp.json

# Copy container initialization script
COPY scripts/container-init.sh /usr/local/bin/container-init.sh
RUN chmod +x /usr/local/bin/container-init.sh

# Set the entrypoint to run init script then keep container alive
ENTRYPOINT ["/usr/local/bin/container-init.sh"]
CMD ["sleep", "infinity"]