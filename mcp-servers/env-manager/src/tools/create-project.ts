import { join } from 'path';
import { mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { config } from '../config.js';
import { logger } from '../services/logger.js';
import { DockerComposeManager } from '../services/docker-compose-manager.js';
import { EnvManager } from '../services/env-manager.js';
import { GitManager } from '../services/git-manager.js';
import { Transaction, OperationBuilder } from '../services/transaction.js';
import { createProjectInputSchema, Validator, type CreateProjectInput } from '../validators.js';
import type { Tool, ToolResponse, ServiceDefinition } from '../types.js';

/**
 * Create a new project with directory structure, Git repo, and docker-compose service
 */
async function handler(args: CreateProjectInput): Promise<ToolResponse> {
    try {
        // Validate input
        const input = createProjectInputSchema.parse(args);
        logger.info('Creating project', { name: input.name });

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

        // Validate Git URL if provided
        if (input.gitUrl) {
            const urlValidation = Validator.validateGitUrl(input.gitUrl);
            if (!urlValidation.valid) {
                return {
                    content: [{
                        type: 'text',
                        text: `Invalid Git URL: ${urlValidation.error}`
                    }],
                    isError: true
                };
            }
        }

        const projectPath = join(config.sandboxRoot, input.name);
        const envFilePath = join(projectPath, '.env');
        const serviceName = `${input.name}-human`;
        const containerName = `${input.name}-human`;

        // Check if service already exists in docker-compose
        const composeManager = new DockerComposeManager(
            join(config.devEnvironmentRoot, 'docker-compose.yml')
        );

        const serviceExists = await composeManager.hasService(serviceName);

        // If project directory doesn't exist, we're creating a new project
        // If project directory exists but service doesn't, we're onboarding an existing project
        let isExistingProject = false;
        try {
            await access(projectPath, constants.F_OK);
            isExistingProject = true;
            // If both directory and service exist, it's already managed
            if (serviceExists) {
                return {
                    content: [{
                        type: 'text',
                        text: `Project '${input.name}' is already created and registered in docker-compose.yml`
                    }],
                    isError: true
                };
            }
            // Directory exists but not registered - this is an onboarding scenario
        } catch {
            // Project directory doesn't exist, continue with creation
            // Check if service exists without directory (shouldn't happen, but be safe)
            if (serviceExists) {
                return {
                    content: [{
                        type: 'text',
                        text: `Service '${serviceName}' exists in docker-compose.yml but project directory is missing at ${projectPath}`
                    }],
                    isError: true
                };
            }
        }

        // Generate preview unless confirmation is provided
        if (!input.confirm) {
            const preview = [
                isExistingProject
                    ? `📋 Onboard Existing Project: ${input.name}`
                    : `📋 Create Project Preview: ${input.name}`,
                '',
                '**Changes to be made:**',
                '',
                isExistingProject
                    ? `1. Use existing directory: ${projectPath}`
                    : `1. Create directory: ${projectPath}`,
                isExistingProject
                    ? `2. Create or update .env file with ${input.envVars ? Object.keys(input.envVars).length : 0} variable(s)`
                    : input.gitUrl
                        ? `2. Clone Git repository: ${input.gitUrl}`
                        : '2. Initialize new Git repository',
                isExistingProject
                    ? `3. Register service '${serviceName}' in docker-compose.yml`
                    : input.gitUrl
                        ? `3. Create .env file with ${input.envVars ? Object.keys(input.envVars).length : 0} variable(s)`
                        : `3. Create .env file with ${input.envVars ? Object.keys(input.envVars).length : 0} variable(s)`,
                !isExistingProject
                    ? `4. Add service '${serviceName}' to docker-compose.yml`
                    : '',
                '',
                '**Service configuration:**',
                `   - Container name: ${containerName}`,
                `   - Image: ${input.image || 'ubuntu:22.04'}`,
                `   - Working directory: /workspace`,
                `   - Volumes: ${projectPath}:/workspace`,
                '',
                input.envVars && Object.keys(input.envVars).length > 0
                    ? '**Environment variables:**\n' +
                    Object.entries(input.envVars).map(([k, v]) => `   ${k}=${v}`).join('\n')
                    : '',
                '',
                '⚠️  To proceed, call this tool again with `confirm: true`'
            ].filter(line => line !== null && line !== '').join('\n');

            return {
                content: [{
                    type: 'text',
                    text: preview
                }]
            };
        }

        // Execute with transaction for rollback on failure
        const transaction = new Transaction();

        // For new projects: Create project directory
        if (!isExistingProject) {
            transaction.add(OperationBuilder.createDirectory(projectPath));
        }

        // Initialize or clone Git repository (only for new projects or if gitUrl provided)
        let gitManager: GitManager | null = null;

        if (!isExistingProject) {
            if (input.gitUrl) {
                transaction.add({
                    description: `Clone Git repository: ${input.gitUrl}`,
                    execute: async () => {
                        gitManager = new GitManager(projectPath);
                        // Clone directly into project path
                        await gitManager.clone(input.gitUrl!, projectPath);
                    },
                    rollback: async () => {
                        // Directory will be removed by parent operation
                    }
                });
            } else {
                transaction.add({
                    description: 'Initialize Git repository',
                    execute: async () => {
                        gitManager = new GitManager(projectPath);
                        await gitManager.init();
                    },
                    rollback: async () => {
                        // .git directory will be removed with project directory
                    }
                });
            }
        }

        // 3. Create .env file
        transaction.add({
            description: 'Create .env file',
            execute: async () => {
                const envManager = new EnvManager(envFilePath);
                const envVars = input.envVars || {};

                // Add default environment variables
                const defaultEnv = {
                    PROJECT_NAME: input.name,
                    WORKSPACE_PATH: '/workspace',
                    ...envVars
                };

                await envManager.write(defaultEnv);
            },
            rollback: async () => {
                // .env file will be removed with project directory
            }
        });

        // 4. Add service to docker-compose.yml
        const serviceConfig: ServiceDefinition = {
            container_name: containerName,
            image: input.image || 'ubuntu:22.04',
            volumes: [`${projectPath}:/workspace`],
            env_file: [`./../sandbox/${input.name}/.env`],
            working_dir: '/workspace',
            networks: ['dev-network'],
            tty: true,
            stdin_open: true,
            command: '/bin/bash'
        };

        let composeBackup = '';

        transaction.add({
            description: 'Add service to docker-compose.yml',
            execute: async () => {
                composeBackup = await composeManager.backup();
                await composeManager.addService(serviceName, serviceConfig);
            },
            rollback: async () => {
                if (composeBackup) {
                    await composeManager.restore(composeBackup);
                }
            }
        });

        // Execute transaction
        await transaction.execute();

        const successMessage = isExistingProject
            ? [
                `✅ Project '${input.name}' onboarded successfully!`,
                '',
                `📁 Location: ${projectPath}`,
                `🐳 Service: ${serviceName}`,
                `📦 Container: ${containerName}`,
                '',
                '**Next steps:**',
                `1. Start the project: start_project --name ${input.name}`,
                `2. Access the container: docker exec -it ${containerName} /bin/bash`,
            ].join('\n')
            : [
                `✅ Project '${input.name}' created successfully!`,
                '',
                `📁 Location: ${projectPath}`,
                `🐳 Service: ${serviceName}`,
                `📦 Container: ${containerName}`,
                '',
                '**Next steps:**',
                `1. Start the project: start_project --name ${input.name}`,
                `2. Access the container: docker exec -it ${containerName} /bin/bash`,
                '',
                input.gitUrl
                    ? `Repository cloned from: ${input.gitUrl}`
                    : 'Git repository initialized'
            ].join('\n');

        logger.info(isExistingProject ? 'Project onboarded successfully' : 'Project created successfully', { name: input.name });

        return {
            content: [{
                type: 'text',
                text: successMessage
            }]
        };

    } catch (error) {
        logger.error('Failed to create project', {
            error: error instanceof Error ? error.message : String(error)
        });

        return {
            content: [{
                type: 'text',
                text: `Error creating project: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
}

export const createProjectTool: Tool = {
    name: 'create_project',
    description: 'Create a new project with directory structure, Git repository, environment file, and docker-compose service. Also supports onboarding existing projects that are not yet managed. Requires confirmation after preview.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Project name (3-50 chars, lowercase letters, numbers, hyphens, underscores). If a directory with this name already exists in sandbox, it will be onboarded as a managed project.'
            },
            gitUrl: {
                type: 'string',
                description: 'Optional Git repository URL to clone (GitHub only). Only used for new projects, ignored when onboarding existing projects.'
            },
            image: {
                type: 'string',
                description: 'Docker image to use (default: ubuntu:22.04)'
            },
            envVars: {
                type: 'object',
                description: 'Optional environment variables to set in .env file',
                additionalProperties: {
                    type: 'string'
                }
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
