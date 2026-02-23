// Main entry point for env-manager MCP server

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createHttpServer } from './server.js';
import { toolRegistry } from './tools/index.js';
import { logger } from './services/logger.js';
import { config } from './config.js';

// Create MCP server instance
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
    logger.debug('ListTools request received');
    const tools = toolRegistry.list();
    logger.debug(`Returning ${tools.length} tools`);
    return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`CallTool request: ${name}`);

    const result = await toolRegistry.call(name, args);
    return result;
});

// Start HTTP/SSE server
async function main() {
    try {
        const httpServer = createHttpServer(server);
        const port = config.port;

        httpServer.listen(port, () => {
            logger.info(`env-manager MCP server listening on port ${port}`, {
                devEnvironmentRoot: config.devEnvironmentRoot,
                sandboxRoot: config.sandboxRoot
            });
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            logger.info('Received SIGINT, shutting down gracefully');
            httpServer.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        });

        process.on('SIGTERM', () => {
            logger.info('Received SIGTERM, shutting down gracefully');
            httpServer.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        });
    } catch (error) {
        logger.error('Fatal error during startup', error);
        process.exit(1);
    }
}

main().catch((error) => {
    logger.error('Unhandled error in main', error);
    process.exit(1);
});
