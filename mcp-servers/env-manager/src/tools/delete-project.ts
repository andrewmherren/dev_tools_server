import { join } from 'node:path';
import { access, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { config } from '../config.js';
import { logger } from '../services/logger.js';
import { DockerComposeManager } from '../services/docker-compose-manager.js';
import { Transaction } from '../services/transaction.js';
import { deleteProjectInputSchema, Validator, type DeleteProjectInput } from '../validators.js';
import type { Tool, ToolResponse } from '../types.js';

const buildDeletePreview = (input: DeleteProjectInput, paths: {
    projectPath: string;
    serviceName: string;
    containerName: string;
}, agentServiceNames: string[]): string => {
    return [
        `⚠️  Unregister Project Preview: ${input.name}`,
        '',
        '**Actions to be performed:**',
        '',
        `1. Remove service '${paths.serviceName}' from docker-compose.yml`,
        agentServiceNames.length > 0
            ? `2. Remove ${agentServiceNames.length} agent service(s): ${agentServiceNames.join(', ')}`
            : '2. No agent services found',
        `3. Delete .env file from project directory`,
        `4. Stop and remove container '${paths.containerName}' if running`,
        '',
        '**What will remain:**',
        `- ✅ Complete project directory at: ${paths.projectPath}`,
        `- ✅ All source code and git repository`,
        `- ✅ All project files and work`,
        '',
        '**To fully delete:**',
        `- You can manually delete the directory: ${paths.projectPath}`,
        '',
        '⚠️  To proceed, call this tool again with `confirm: true`'
    ].join('\n');
};

const buildDeleteSuccessMessage = (input: DeleteProjectInput, paths: {
    projectPath: string;
}, agentServiceNames: string[], hasService: boolean): string => {
    return [
        `✅ Project '${input.name}' unregistered successfully!`,
        '',
        `🗂️  Project directory remains at: ${paths.projectPath}`,
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
        `   Delete: ${paths.projectPath}`,
        '',
        '**If you want to re-register it later:**',
        `   Use: create_project --name ${input.name}`
    ].filter(line => line !== '').join('\n');
};

const validateProjectName = (name: string): ToolResponse | null => {
    const validation = Validator.validateProjectName(name);
    if (!validation.valid) {
        return {
            content: [{ type: 'text', text: `Invalid project name: ${validation.error}` }],
            isError: true
        };
    }
    return null;
};

const validateProjectExists = async (projectPath: string, name: string): Promise<ToolResponse | null> => {
    try {
        await access(projectPath, constants.F_OK);
        return null;
    } catch {
        return {
            content: [{ type: 'text', text: `Project '${name}' does not exist` }],
            isError: true
        };
    }
};

const getAgentServices = (composeServices: Record<string, any>, projectName: string): string[] => {
    const agentPattern = new RegExp(`^${projectName}-agent-\\d+$`);
    return Object.keys(composeServices).filter(svc => agentPattern.test(svc));
};

const addEnvFileDeletion = (transaction: Transaction, envFilePath: string): void => {
    transaction.add({
        description: 'Delete .env file',
        execute: async () => {
            try {
                await access(envFilePath, constants.F_OK);
                await rm(envFilePath, { force: true });
            } catch {
                // File doesn't exist, ok
            }
        },
        rollback: async () => {
            logger.warn('Cannot restore deleted .env file', { path: envFilePath });
        }
    });
};

const addComposeOperations = (
    transaction: Transaction,
    serviceName: string,
    composeManager: DockerComposeManager,
    agentServiceNames: string[]
): { composeBackup: string } => {
    const state = { composeBackup: '' };

    transaction.add({
        description: 'Remove human service from docker-compose.yml',
        execute: async () => {
            state.composeBackup = await composeManager.backup();
            await composeManager.removeService(serviceName);
        },
        rollback: async () => {
            if (state.composeBackup) {
                await composeManager.restore(state.composeBackup);
            }
        }
    });

    for (const agentServiceName of agentServiceNames) {
        transaction.add({
            description: `Remove agent service '${agentServiceName}' from docker-compose.yml`,
            execute: async () => {
                if (!state.composeBackup) {
                    state.composeBackup = await composeManager.backup();
                }
                await composeManager.removeService(agentServiceName);
            },
            rollback: async () => {
                if (state.composeBackup) {
                    await composeManager.restore(state.composeBackup);
                }
            }
        });
    }

    return state;
};

/**
 * Unregister a project from env-manager (removes management configuration)
 */
async function handler(args: DeleteProjectInput): Promise<ToolResponse> {
    try {
        const input = deleteProjectInputSchema.parse(args);
        logger.info('Unregistering project', { name: input.name });

        const nameError = validateProjectName(input.name);
        if (nameError) return nameError;

        const projectPath = join(config.sandboxRoot, input.name);
        const existsError = await validateProjectExists(projectPath, input.name);
        if (existsError) return existsError;

        const envFilePath = join(projectPath, '.env');
        const serviceName = `${input.name}-human`;
        const containerName = `${input.name}-human`;
        const paths = { projectPath, serviceName, containerName };

        const composeManager = new DockerComposeManager(
            join(config.devEnvironmentRoot, 'docker-compose.yml')
        );
        const hasService = await composeManager.hasService(serviceName);
        const composeConfig = await composeManager.read();
        const agentServiceNames = getAgentServices(composeConfig.services, input.name);

        if (!input.confirm) {
            return {
                content: [{
                    type: 'text',
                    text: buildDeletePreview(input, paths, agentServiceNames)
                }]
            };
        }

        const transaction = new Transaction();
        addComposeOperations(transaction, serviceName, composeManager, agentServiceNames);
        addEnvFileDeletion(transaction, envFilePath);

        await transaction.execute();
        const successMessage = buildDeleteSuccessMessage(input, { projectPath }, agentServiceNames, hasService);
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
