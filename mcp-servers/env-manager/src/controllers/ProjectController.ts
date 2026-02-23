import { Controller, Post, Get, Body, Route, Response, SuccessResponse } from 'tsoa';
import { logger } from '../services/logger.js';
import { createProjectTool } from '../tools/create-project.js';
import { listProjects as listProjectsService } from '../tools/list-projects.js';
import { deleteProjectTool } from '../tools/delete-project.js';
import type { CreateProjectInput, DeleteProjectInput } from '../validators.js';
import type { ToolResponse, ProjectInfo } from '../types.js';

interface CreateProjectRequest {
    /**
     * Project name (lowercase letters, numbers, hyphens, underscores).
     * Example: "my-app"
     */
    name: string;
    /**
     * Optional Git repository URL to clone.
     * Example: "https://github.com/org/repo.git"
     */
    gitUrl?: string;
    /**
     * Docker image to use for the project container.
     * Example: "ubuntu:22.04"
     */
    image?: string;
    /**
     * Environment variables to write into the project's .env file.
     * Example: { "NODE_ENV": "development" }
     */
    envVars?: Record<string, string>;
    /**
     * When true, applies changes. When false or omitted, returns a preview only.
     */
    confirm?: boolean;
}

interface DeleteProjectRequest {
    /**
     * Project name to unregister.
     * Example: "my-app"
     */
    name: string;
    /**
     * When true, applies changes. When false or omitted, returns a preview only.
     */
    confirm?: boolean;
}

interface ApiResponse {
    success: boolean;
    data?: ToolResponse;
    error?: string;
}

interface ListProjectsResponse {
    count: number;
    projects: ProjectInfo[];
}

interface ActionResponse {
    status: 'preview' | 'success' | 'error';
    message: string;
    toolOutput?: ToolResponse;
}

@Route('projects')
export class ProjectController extends Controller {
    /**
     * Create a new project or onboard an existing one
     */
    @Post('/')
    @SuccessResponse('200', 'Project created or preview returned')
    @Response<ApiResponse>('400', 'Invalid input or project already exists')
    async createProject(
        @Body() request: CreateProjectRequest
    ): Promise<ActionResponse> {
        try {
            logger.info('REST: createProject', { name: request.name, confirm: request.confirm });

            const input: CreateProjectInput = {
                name: request.name,
                gitUrl: request.gitUrl,
                image: request.image,
                envVars: request.envVars,
                confirm: request.confirm || false
            };

            const result = await createProjectTool.handler(input);

            const message = result.content?.[0]?.text || 'No message returned.';

            if (result.isError) {
                this.setStatus(400);
                return {
                    status: 'error',
                    message,
                    toolOutput: result
                };
            }

            // If this is a preview (no confirmation), return as preview
            if (!request.confirm) {
                return {
                    status: 'preview',
                    message,
                    toolOutput: result
                };
            }

            return {
                status: 'success',
                message,
                toolOutput: result
            };
        } catch (error) {
            logger.error('REST: createProject failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            this.setStatus(400);
            return {
                status: 'error',
                message: `Error creating project: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * List all managed projects
     */
    @Get('/')
    @SuccessResponse('200', 'Projects listed successfully')
    @Response<{ error: string }>('400', 'Failed to list projects')
    async listProjects(): Promise<ListProjectsResponse | { error: string }> {
        try {
            logger.info('REST: listProjects');

            const projects = await listProjectsService();
            return { count: projects.length, projects };
        } catch (error) {
            logger.error('REST: listProjects failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            this.setStatus(400);
            return {
                error: `Error listing projects: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * Delete/unregister a project
     */
    @Post('{name}/delete')
    @SuccessResponse('200', 'Project unregistered or preview returned')
    @Response<ApiResponse>('400', 'Invalid project name or not found')
    async deleteProject(
        @Body() request: DeleteProjectRequest
    ): Promise<ActionResponse> {
        try {
            logger.info('REST: deleteProject', { name: request.name, confirm: request.confirm });

            const input: DeleteProjectInput = {
                name: request.name,
                confirm: request.confirm || false
            };

            const result = await deleteProjectTool.handler(input);

            const message = result.content?.[0]?.text || 'No message returned.';

            if (result.isError) {
                this.setStatus(400);
                return {
                    status: 'error',
                    message,
                    toolOutput: result
                };
            }

            // If this is a preview (no confirmation), return as preview
            if (!request.confirm) {
                return {
                    status: 'preview',
                    message,
                    toolOutput: result
                };
            }

            return {
                status: 'success',
                message,
                toolOutput: result
            };
        } catch (error) {
            logger.error('REST: deleteProject failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            this.setStatus(400);
            return {
                status: 'error',
                message: `Error deleting project: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}
