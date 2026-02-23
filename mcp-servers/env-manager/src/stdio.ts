// Stdio transport entry point for MCP server
// Used by VS Code Copilot and other stdio-based MCP clients

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { toolRegistry } from './tools/index.js';
import { logger } from './services/logger.js';
import { config } from './config.js';

// Create MCP server
const server = new Server(
    {
        name: 'env-manager',
        version: '0.1.0'
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

// Register request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Handling ListTools request (stdio)');
    const tools = toolRegistry.list();
    return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info('Handling CallTool request (stdio)', { toolName: name });

    const result = await toolRegistry.call(name, args);
    return result;
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await server.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await server.close();
    process.exit(0);
});

// Start server with stdio transport
async function main() {
    logger.info('env-manager MCP server starting (stdio transport)', {
        devEnvironmentRoot: config.devEnvironmentRoot,
        sandboxRoot: config.sandboxRoot,
        logLevel: config.logLevel
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('env-manager MCP server connected via stdio');
}

main().catch((error) => {
    logger.error('Failed to start MCP server', {
        error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
});

