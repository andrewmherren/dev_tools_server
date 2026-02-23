// Health check tool for env-manager

import { z } from 'zod';
import { dockerClient } from '../services/docker-client.js';
import { config } from '../config.js';
import { existsSync } from 'fs';
import type { Tool } from '../types.js';

export const healthCheckTool: Tool = {
    name: 'health_check',
    description: 'Verify env-manager can access Docker daemon and filesystem volumes',
    inputSchema: z.object({}),

    async handler() {
        const dockerOk = await dockerClient.ping();
        const devEnvExists = existsSync(config.devEnvironmentRoot);
        const sandboxExists = existsSync(config.sandboxRoot);

        const status =
            dockerOk && devEnvExists && sandboxExists ? 'healthy' : 'degraded';

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        {
                            docker_available: dockerOk,
                            dev_environment_accessible: devEnvExists,
                            dev_environment_path: config.devEnvironmentRoot,
                            sandbox_accessible: sandboxExists,
                            sandbox_path: config.sandboxRoot,
                            status
                        },
                        null,
                        2
                    )
                }
            ]
        };
    }
};
