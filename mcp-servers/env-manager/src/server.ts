// HTTP/SSE server for MCP transport

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Express, Request, Response, NextFunction } from 'express';
import * as http from 'http';
import { logger } from './services/logger.js';
import { RegisterRoutes } from './generated/routes.js';
import * as fs from 'fs';
import * as path from 'path';

export function createHttpServer(mcpServer: Server): http.Server {
    const app: Express = express();
    
    // Store active transports keyed by session ID
    const transports = new Map<string, SSEServerTransport>();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // CORS middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        next();
    });

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
        res.json({
            status: 'ok',
            service: 'env-manager',
            version: '0.1.0'
        });
    });

    // Swagger UI endpoint - serve the generated OpenAPI spec
    app.get('/api/docs', (req: Request, res: Response) => {
        // Try both locations for swagger.json during development and production
        const swaggerPaths = [
            path.join(process.cwd(), 'src', 'generated', 'swagger.json'),
            path.join(process.cwd(), 'dist', 'generated', 'swagger.json')
        ];
        
        let swaggerJson: string | null = null;
        for (const swaggerPath of swaggerPaths) {
            try {
                swaggerJson = fs.readFileSync(swaggerPath, 'utf-8');
                break;
            } catch (e) {
                // Try next path
            }
        }

        if (!swaggerJson) {
            logger.warn('Failed to load Swagger UI', {
                error: 'swagger.json not found in any location'
            });
            res.status(404).json({ error: 'Swagger UI not found' });
            return;
        }

        // Serve a basic Swagger UI HTML
            const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>env-manager API Documentation</title>
                    <meta charset="utf-8"/>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
                </head>
                <body>
                    <div id="swagger-ui"></div>
                    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
                    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
                    <script>
                        window.ui = SwaggerUIBundle({
                            url: '/env-manager/api/swagger.json',
                            dom_id: '#swagger-ui',
                            presets: [
                                SwaggerUIBundle.presets.apis,
                                SwaggerUIStandalonePreset
                            ],
                            layout: "BaseLayout"
                        });
                    </script>
                </body>
            </html>`;
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    });

    // Serve swagger.json directly
    app.get('/api/swagger.json', (req: Request, res: Response) => {
        // Try both locations for swagger.json during development and production
        const swaggerPaths = [
            path.join(process.cwd(), 'src', 'generated', 'swagger.json'),
            path.join(process.cwd(), 'dist', 'generated', 'swagger.json')
        ];

        let swaggerJson: string | null = null;
        for (const swaggerPath of swaggerPaths) {
            try {
                swaggerJson = fs.readFileSync(swaggerPath, 'utf-8');
                break;
            } catch (e) {
                // Try next path
            }
        }

        if (!swaggerJson) {
            logger.warn('Failed to load swagger.json', {
                error: 'File not found in any location'
            });
            res.status(404).json({ error: 'swagger.json not found' });
            return;
        }

        const forwardedProto = req.headers['x-forwarded-proto'];
        const scheme = Array.isArray(forwardedProto)
            ? forwardedProto[0]
            : forwardedProto || req.protocol || 'http';
        const host = req.headers.host || 'localhost';

        const parsed = JSON.parse(swaggerJson);
        parsed.servers = [{ url: `${scheme}://${host}/env-manager/api` }];

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(parsed));
    });

    // Register tsoa-generated REST routes under /api prefix
    const apiRouter = express.Router();
    RegisterRoutes(apiRouter);
    app.use('/api', apiRouter);

    // SSE endpoint - establishes Server-Sent Events connection
    app.get('/sse', async (req: Request, res: Response) => {
        logger.info('New SSE connection established');

        // Generate a session ID for this connection
        const sessionId = Math.random().toString(36).substring(7);

        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Session-Id': sessionId
        });

        // Create transport with the message endpoint and response stream
        const transport = new SSEServerTransport('/message', res);
        transports.set(sessionId, transport);

        // Connect the MCP server to this transport
        await mcpServer.connect(transport);

        // Clean up on connection close
        (req as any).on('close', () => {
            logger.info('SSE connection closed', { sessionId });
            transports.delete(sessionId);
            transport.close();
        });
    });

    // POST endpoint for messages from client
    app.post('/message', (req: Request, res: Response) => {
        try {
            const message = req.body;
            logger.debug('Received message from client', {
                method: message.method,
                id: message.id
            });

            // Message will be handled by the SSE transport automatically
            res.status(202).json({ accepted: true });
        } catch (error) {
            logger.error('Failed to process message', {
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(400).json({ error: 'Invalid JSON' });
        }
    });

    // 404 handler for other routes
    app.use((req: Request, res: Response) => {
        logger.warn('Route not found', { url: req.url, method: req.method });
        res.status(404).json({ error: 'Not found' });
    });

    // Create and return HTTP server from Express app
    const httpServer = http.createServer(app);
    return httpServer;
}
