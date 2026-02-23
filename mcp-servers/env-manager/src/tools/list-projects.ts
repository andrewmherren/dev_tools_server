import { join } from 'path';
import { readdir, access } from 'fs/promises';
import { constants } from 'fs';
import { config } from '../config.js';
import { logger } from '../services/logger.js';
import { DockerComposeManager } from '../services/docker-compose-manager.js';
import { GitManager } from '../services/git-manager.js';
import type { Tool, ToolResponse, ProjectInfo } from '../types.js';

/**
 * List all projects in the sandbox
 */
export async function listProjects(): Promise<ProjectInfo[]> {
    try {
        logger.info('Listing projects');

        const sandboxPath = config.sandboxRoot;
        const composeManager = new DockerComposeManager(
            join(config.devEnvironmentRoot, 'docker-compose.yml')
        );

        // Read all directories in sandbox
        const entries = await readdir(sandboxPath, { withFileTypes: true });
        const projectDirs = entries
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);

        logger.debug('Found directories in sandbox', { count: projectDirs.length });

        // Read docker-compose.yml to get service information
        const composeConfig = await composeManager.read();
        const services = composeConfig.services;

        const projects: ProjectInfo[] = [];

        for (const projectName of projectDirs) {
            const projectPath = join(sandboxPath, projectName);

            // Check if project has a Git repository
            const gitManager = new GitManager(projectPath);
            const isGitRepo = await gitManager.isRepository();

            // Find associated service in docker-compose
            const serviceName = `${projectName}-human`;
            const service = services[serviceName];

            if (service) {
                // Get container status from docker-compose if available
                const containerName = service.container_name || serviceName;

                projects.push({
                    name: projectName,
                    path: projectPath,
                    service: serviceName,
                    status: 'configured', // Would need docker ps to get actual status
                    human_container: containerName,
                    agents: [] // Phase 3 feature
                });

                logger.debug('Found project', {
                    name: projectName,
                    service: serviceName,
                    isGitRepo
                });
            } else {
                // Project directory exists but no service configured
                logger.debug('Found unmanaged project directory', { name: projectName });
            }
        }

        logger.info('Listed projects successfully', { count: projects.length });
        return projects;
    } catch (error) {
        logger.error('Failed to list projects', {
            error: error instanceof Error ? error.message : String(error)
        });

        throw new Error(`Error listing projects: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function handler(): Promise<ToolResponse> {
    try {
        const projects = await listProjects();

        if (projects.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: 'No projects found. Use create_project to create a new project.'
                }]
            };
        }

        // Format output
        const output = [
            `Found ${projects.length} project(s):`,
            '',
            ...projects.map(p => {
                const lines = [
                    `📦 ${p.name}`,
                    `   Path: ${p.path}`,
                    `   Service: ${p.service}`,
                    `   Status: ${p.status}`,
                    `   Container: ${p.human_container}`
                ];

                if (p.agents && p.agents.length > 0) {
                    lines.push(`   Agents: ${p.agents.map(a => a.name).join(', ')}`);
                }

                return lines.join('\n');
            })
        ].join('\n');

        return {
            content: [{
                type: 'text',
                text: output
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: error instanceof Error ? error.message : String(error)
            }],
            isError: true
        };
    }
}

export const listProjectsTool: Tool = {
    name: 'list_projects',
    description: 'List all projects in the development environment with their status and configuration',
    inputSchema: {
        type: 'object',
        properties: {},
        required: []
    },
    handler
};
