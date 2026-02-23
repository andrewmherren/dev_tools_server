// Tool registry for managing MCP tools

import type { Tool } from '../types.js';
import { healthCheckTool } from './health.js';
import { createProjectTool } from './create-project.js';
import { listProjectsTool } from './list-projects.js';
import { deleteProjectTool } from './delete-project.js';
import { logger } from '../services/logger.js';

class ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    constructor() {
        // Register all tools
        this.register(healthCheckTool);
        this.register(createProjectTool);
        this.register(listProjectsTool);
        this.register(deleteProjectTool);
    }

    register(tool: Tool): void {
        this.tools.set(tool.name, tool);
        logger.debug(`Registered tool: ${tool.name}`);
    }

    list(): Array<{ name: string; description: string; inputSchema: any }> {
        return Array.from(this.tools.values()).map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }));
    }

    async call(name: string, args: any): Promise<any> {
        const tool = this.tools.get(name);

        if (!tool) {
            logger.error(`Tool not found: ${name}`);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: true,
                            message: `Tool not found: ${name}`
                        })
                    }
                ],
                isError: true
            };
        }

        try {
            logger.info(`Calling tool: ${name}`, { args });
            const result = await tool.handler(args);
            logger.debug(`Tool ${name} completed successfully`);
            return result;
        } catch (error) {
            logger.error(`Tool ${name} failed`, error);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: true,
                            tool: name,
                            message: error instanceof Error ? error.message : 'Unknown error'
                        })
                    }
                ],
                isError: true
            };
        }
    }
}

export const toolRegistry = new ToolRegistry();
