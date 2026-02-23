import { join } from 'path';
import { access, rm, readdir } from 'fs/promises';
import { constants } from 'fs';
import { config } from '../config.js';
import { logger } from '../services/logger.js';
import { DockerComposeManager } from '../services/docker-compose-manager.js';
import { Transaction } from '../services/transaction.js';
import { deleteProjectInputSchema, Validator, type DeleteProjectInput } from '../validators.js';
import type { Tool, ToolResponse } from '../types.js';

/**
 * Unregister a project from env-manager (removes management configuration)
 */
async function handler(args: DeleteProjectInput): Promise<ToolResponse> {
    try {
        // Validate input
        const input = deleteProjectInputSchema.parse(args);
        logger.info('Unregistering project', { name: input.name });

        // Validate project name
        const nameValidation = Validator.validateProjectName(input.name);
        if (!nameValidation.valid) {
            return {
                content: [{
                    type: 'text',
                    text: `Invalid project name: ${nameValidation.error}`
                }],
                isError: true
            };
        }

        const projectPath = join(config.sandboxRoot, input.name);
        const envFilePath = join(projectPath, '.env');
        const serviceName = `${input.name}-human`;
        const containerName = `${input.name}-human`;

        // Check if project exists
        try {
            await access(projectPath, constants.F_OK);
        } catch {
            return {
                content: [{
                    type: 'text',
                    text: `Project '${input.name}' does not exist`
                }],
                isError: true
            };
        }

        const composeManager = new DockerComposeManager(
            join(config.devEnvironmentRoot, 'docker-compose.yml')
        );

        // Check if service exists in docker-compose
        const hasService = await composeManager.hasService(serviceName);

        // Find all agent services for this project
        const composeConfig = await composeManager.read();
        const agentServiceNames: string[] = [];
        const agentPattern = new RegExp(`^${input.name}-agent-\\d+$`);

        for (const serviceName of Object.keys(composeConfig.services)) {
            if (agentPattern.test(serviceName)) {
                agentServiceNames.push(serviceName);
            }
        }

        // Generate preview unless confirmation is provided
        if (!input.confirm) {
            const preview = [
                `⚠️  Unregister Project Preview: ${input.name}`,
                '',
                '**Actions to be performed:**',
                '',
                `1. Remove service '${serviceName}' from docker-compose.yml`,
                agentServiceNames.length > 0
                    ? `2. Remove ${agentServiceNames.length} agent service(s): ${agentServiceNames.join(', ')}`
                    : '2. No agent services found',
                `3. Delete .env file from project directory`,
                `4. Stop and remove container '${containerName}' if running`,
                '',
                '**What will remain:**',
                `- ✅ Complete project directory at: ${projectPath}`,
                `- ✅ All source code and git repository`,
                `- ✅ All project files and work`,
                '',
                '**To fully delete:**',
                `- You can manually delete the directory: ${projectPath}`,
                '',
                '⚠️  To proceed, call this tool again with `confirm: true`'
            ].join('\n');

            return {
                content: [{
                    type: 'text',
                    text: preview
                }]
            };
        }

        // Execute with transaction for rollback on failure
        const transaction = new Transaction();

        let composeBackup = '';

        // 1. Remove human service from docker-compose.yml
        if (hasService) {
            transaction.add({
                description: 'Remove human service from docker-compose.yml',
                execute: async () => {
                    composeBackup = await composeManager.backup();
                    await composeManager.removeService(serviceName);
                },
                rollback: async () => {
                    if (composeBackup) {
                        await composeManager.restore(composeBackup);
                    }
                }
            });
        }

        // 2. Remove all agent services
        for (const agentServiceName of agentServiceNames) {
            transaction.add({
                description: `Remove agent service '${agentServiceName}' from docker-compose.yml`,
                execute: async () => {
                    if (!composeBackup) {
                        composeBackup = await composeManager.backup();
                    }
                    await composeManager.removeService(agentServiceName);
                },
                rollback: async () => {
                    if (composeBackup) {
                        await composeManager.restore(composeBackup);
                    }
                }
            });
        }

        // 3. Delete .env file
        transaction.add({
            description: 'Delete .env file',
            execute: async () => {
                try {
                    await access(envFilePath, constants.F_OK);
                    await rm(envFilePath, { force: true });
                } catch {
                    // File doesn't exist, that's fine
                }
            },
            rollback: async () => {
                logger.warn('Cannot restore deleted .env file', { path: envFilePath });
            }
        });

        // Execute transaction
        await transaction.execute();

        const successMessage = [
            `✅ Project '${input.name}' unregistered successfully!`,
            '',
            `🗂️  Project directory remains at: ${projectPath}`,
            `📂 All source code and git repository are intact`,
            '',
            hasService || agentServiceNames.length > 0
                ? `🐳 Services removed from docker-compose.yml`
                : '',
            agentServiceNames.length > 0
                ? `🤖 Agent services removed: ${agentServiceNames.join(', ')}`
                : '',
            '',
            '**If you want to completely remove the project:**',
            `   Delete: ${projectPath}`,
            '',
            '**If you want to re-register it later:**',
            `   Use: create_project --name ${input.name}`
        ].filter(line => line !== '').join('\n');

        logger.info('Project unregistered successfully', { name: input.name, hasService, agentCount: agentServiceNames.length });

        return {
            content: [{
                type: 'text',
                text: successMessage
            }]
        };

    } catch (error) {
        logger.error('Failed to delete project', {
            error: error instanceof Error ? error.message : String(error)
        });

        return {
            content: [{
                type: 'text',
                text: `Error deleting project: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

export const deleteProjectTool: Tool = {
    name: 'delete_project',
    description: 'Unregister a project from env-manager (removes configuration and docker-compose service), but preserves the project directory, git repository, and all source code. The directory can be manually deleted later if desired.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Project name to unregister'
            },
            confirm: {
                type: 'boolean',
                description: 'Set to true to execute after reviewing preview'
            }
        },
        required: ['name']
    },
    handler
};
