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

const DEFAULT_IMAGE = 'ubuntu:22.04';

type ProjectPaths = {
    projectPath: string;
    envFilePath: string;
    serviceName: string;
    containerName: string;
};

const buildErrorResponse = (text: string): ToolResponse => ({
    content: [{
        type: 'text',
        text
    }],
    isError: true
});

const fileExists = async (path: string): Promise<boolean> => {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
};

const getProjectPaths = (name: string): ProjectPaths => {
    const projectPath = join(config.sandboxRoot, name);

    return {
        projectPath,
        envFilePath: join(projectPath, '.env'),
        serviceName: `${name}-human`,
        containerName: `${name}-human`
    };
};

const validateInput = (input: CreateProjectInput): ToolResponse | null => {
    const nameValidation = Validator.validateProjectName(input.name);
    if (!nameValidation.valid) {
        return buildErrorResponse(`Invalid project name: ${nameValidation.error}`);
    }

    if (input.gitUrl) {
        const urlValidation = Validator.validateGitUrl(input.gitUrl);
        if (!urlValidation.valid) {
            return buildErrorResponse(`Invalid Git URL: ${urlValidation.error}`);
        }
    }

    return null;
};

const resolveProjectState = async (
    projectName: string,
    projectPath: string,
    serviceName: string,
    composeManager: DockerComposeManager
): Promise<{ isExistingProject: boolean; error?: ToolResponse }> => {
    const serviceExists = await composeManager.hasService(serviceName);
    const projectExists = await fileExists(projectPath);

    if (projectExists && serviceExists) {
        return {
            isExistingProject: true,
            error: buildErrorResponse(
                `Project '${projectName}' is already created and registered in docker-compose.yml`
            )
        };
    }

    if (!projectExists && serviceExists) {
        return {
            isExistingProject: false,
            error: buildErrorResponse(
                `Service '${serviceName}' exists in docker-compose.yml but project directory is missing at ${projectPath}`
            )
        };
    }

    return { isExistingProject: projectExists };
};

const buildPreview = (input: CreateProjectInput, paths: ProjectPaths, isExistingProject: boolean): string => {
    const envVarCount = input.envVars ? Object.keys(input.envVars).length : 0;
    let step2 = `2. Create or update .env file with ${envVarCount} variable(s)`;
    if (!isExistingProject) {
        step2 = input.gitUrl
            ? `2. Clone Git repository: ${input.gitUrl}`
            : '2. Initialize new Git repository';
    }
    const step3 = isExistingProject
        ? `3. Register service '${paths.serviceName}' in docker-compose.yml`
        : `3. Create .env file with ${envVarCount} variable(s)`;
    const step4 = isExistingProject ? '' : `4. Add service '${paths.serviceName}' to docker-compose.yml`;
    const envVarSummary = input.envVars && envVarCount > 0
        ? ['**Environment variables:**',
            Object.entries(input.envVars).map(([k, v]) => `   ${k}=${v}`).join('\n')].join('\n')
        : '';

    const previewLines = [
        isExistingProject
            ? `📋 Onboard Existing Project: ${input.name}`
            : `📋 Create Project Preview: ${input.name}`,
        '',
        '**Changes to be made:**',
        '',
        isExistingProject
            ? `1. Use existing directory: ${paths.projectPath}`
            : `1. Create directory: ${paths.projectPath}`,
        step2,
        step3,
        step4,
        '',
        '**Service configuration:**',
        `   - Container name: ${paths.containerName}`,
        `   - Image: ${input.image || DEFAULT_IMAGE}`,
        '   - Working directory: /workspace',
        `   - Volumes: ${paths.projectPath}:/workspace`,
        '',
        envVarSummary,
        '',
        '⚠️  To proceed, call this tool again with `confirm: true`'
    ];

    return previewLines.filter(line => line !== '').join('\n');
};

const buildSuccessMessage = (input: CreateProjectInput, paths: ProjectPaths, isExistingProject: boolean): string => {
    const baseLines = [
        isExistingProject
            ? `✅ Project '${input.name}' onboarded successfully!`
            : `✅ Project '${input.name}' created successfully!`,
        '',
        `📁 Location: ${paths.projectPath}`,
        `🐳 Service: ${paths.serviceName}`,
        `📦 Container: ${paths.containerName}`,
        '',
        '**Next steps:**',
        `1. Start the project: start_project --name ${input.name}`,
        `2. Access the container: docker exec -it ${paths.containerName} /bin/bash`
    ];

    if (!isExistingProject) {
        baseLines.push('');
        baseLines.push(input.gitUrl
            ? `Repository cloned from: ${input.gitUrl}`
            : 'Git repository initialized');
    }

    return baseLines.join('\n');
};

const buildServiceConfig = (input: CreateProjectInput, paths: ProjectPaths): ServiceDefinition => ({
    container_name: paths.containerName,
    image: input.image || DEFAULT_IMAGE,
    volumes: [`${paths.projectPath}:/workspace`],
    env_file: [`./../sandbox/${input.name}/.env`],
    working_dir: '/workspace',
    networks: ['dev-network'],
    tty: true,
    stdin_open: true,
    command: '/bin/bash'
});

const addGitOperations = (
    transaction: Transaction,
    input: CreateProjectInput,
    projectPath: string,
    isExistingProject: boolean
): void => {
    if (isExistingProject) {
        return;
    }

    if (input.gitUrl) {
        transaction.add({
            description: `Clone Git repository: ${input.gitUrl}`,
            execute: async () => {
                const gitManager = new GitManager(projectPath);
                await gitManager.clone(input.gitUrl!, projectPath);
            },
            rollback: async () => {
                // Directory will be removed by parent operation
            }
        });
        return;
    }

    transaction.add({
        description: 'Initialize Git repository',
        execute: async () => {
            const gitManager = new GitManager(projectPath);
            await gitManager.init();
        },
        rollback: async () => {
            // .git directory will be removed with project directory
        }
    });
};

const addEnvFileOperation = (
    transaction: Transaction,
    envFilePath: string,
    input: CreateProjectInput
): void => {
    transaction.add({
        description: 'Create .env file',
        execute: async () => {
            const envManager = new EnvManager(envFilePath);
            const envVars = input.envVars || {};
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
};

const addComposeOperation = (
    transaction: Transaction,
    composeManager: DockerComposeManager,
    serviceName: string,
    serviceConfig: ServiceDefinition
): void => {
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
};

const registerProjectOperations = (
    transaction: Transaction,
    input: CreateProjectInput,
    paths: ProjectPaths,
    composeManager: DockerComposeManager,
    isExistingProject: boolean
): void => {
    if (!isExistingProject) {
        transaction.add(OperationBuilder.createDirectory(paths.projectPath));
    }

    addGitOperations(transaction, input, paths.projectPath, isExistingProject);
    addEnvFileOperation(transaction, paths.envFilePath, input);
    addComposeOperation(transaction, composeManager, paths.serviceName, buildServiceConfig(input, paths));
};

const setupProjectManager = async (
    projectName: string
): Promise<{ composeManager: DockerComposeManager; paths: ProjectPaths } | ToolResponse> => {
    const paths = getProjectPaths(projectName);
    const composeManager = new DockerComposeManager(
        join(config.devEnvironmentRoot, 'docker-compose.yml')
    );
    return { composeManager, paths };
};

const validateAndResolveProject = async (
    input: CreateProjectInput,
    composeManager: DockerComposeManager,
    paths: ProjectPaths
): Promise<{ isExistingProject: boolean } | ToolResponse> => {
    const validationError = validateInput(input);
    if (validationError) return validationError;

    const projectState = await resolveProjectState(
        input.name,
        paths.projectPath,
        paths.serviceName,
        composeManager
    );
    if (projectState.error) return projectState.error;

    return { isExistingProject: projectState.isExistingProject };
};

const handlePreviewMode = (
    input: CreateProjectInput,
    paths: ProjectPaths,
    isExistingProject: boolean
): ToolResponse | null => {
    if (!input.confirm) {
        return {
            content: [{
                type: 'text',
                text: buildPreview(input, paths, isExistingProject)
            }]
        };
    }
    return null;
};

const isToolResponse = (obj: unknown): obj is ToolResponse => {
    return obj !== null && typeof obj === 'object' && 'content' in obj;
};

/**
 * Create a new project with directory structure, Git repo, and docker-compose service
 */
async function handler(args: CreateProjectInput): Promise<ToolResponse> {
    try {
        const input = createProjectInputSchema.parse(args);
        logger.info('Creating project', { name: input.name });

        const setup = await setupProjectManager(input.name);
        if (isToolResponse(setup)) return setup;

        const resolution = await validateAndResolveProject(input, setup.composeManager, setup.paths);
        if (isToolResponse(resolution)) return resolution;

        const previewResponse = handlePreviewMode(input, setup.paths, resolution.isExistingProject);
        if (previewResponse) return previewResponse;

        const transaction = new Transaction();
        registerProjectOperations(transaction, input, setup.paths, setup.composeManager, resolution.isExistingProject);
        await transaction.execute();

        const successMessage = buildSuccessMessage(input, setup.paths, resolution.isExistingProject);
        logger.info(resolution.isExistingProject ? 'Project onboarded successfully' : 'Project created successfully', { name: input.name });

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
