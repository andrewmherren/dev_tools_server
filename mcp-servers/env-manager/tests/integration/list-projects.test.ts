// Integration test for list-projects tool

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { config } from '../../src/config.js';

vi.mock('fs/promises');
vi.mock('../../src/services/docker-compose-manager.js');
vi.mock('../../src/services/git-manager.js');

import { readdir } from 'fs/promises';
import { DockerComposeManager } from '../../src/services/docker-compose-manager.js';
import { GitManager } from '../../src/services/git-manager.js';
import { listProjectsTool, listProjects } from '../../src/tools/list-projects.js';

describe('list_projects tool', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        config.sandboxRoot = '/sandbox';
        config.devEnvironmentRoot = '/dev_environment';
    });

    it('should list projects with services', async () => {
        // Mock directory listing
        vi.mocked(readdir).mockResolvedValue([
            { name: 'project1', isDirectory: () => true } as any,
            { name: 'project2', isDirectory: () => true } as any,
            { name: 'file.txt', isDirectory: () => false } as any
        ]);

        // Mock docker-compose config
        vi.mocked(DockerComposeManager.prototype.read).mockResolvedValue({
            services: {
                'project1-human': {
                    container_name: 'project1_human',
                    image: 'node:20'
                },
                'project2-human': {
                    container_name: 'project2_human',
                    image: 'python:3.11'
                }
            }
        } as any);

        // Mock git repository checks
        vi.mocked(GitManager.prototype.isRepository).mockResolvedValue(true);

        const projects = await listProjects();

        expect(projects).toHaveLength(2);
        expect(projects[0].name).toBe('project1');
        expect(projects[0].path).toContain('project1');
        expect(projects[0].service).toBe('project1-human');
        expect(projects[0].status).toBe('configured');
        expect(projects[0].human_container).toBe('project1_human');
        expect(projects[1].name).toBe('project2');
        expect(projects[1].path).toContain('project2');
        expect(projects[1].service).toBe('project2-human');
    });

    it('should return empty list when no projects exist', async () => {
        vi.mocked(readdir).mockResolvedValue([]);
        vi.mocked(DockerComposeManager.prototype.read).mockResolvedValue({
            services: {}
        } as any);

        const result = await listProjectsTool.handler({});

        expect(result.content).toHaveLength(1);
        expect(result.content[0].text).toContain('No projects found');
    });

    it('should filter out unmanaged directories', async () => {
        vi.mocked(readdir).mockResolvedValue([
            { name: 'managed', isDirectory: () => true } as any,
            { name: 'unmanaged', isDirectory: () => true } as any
        ]);

        vi.mocked(DockerComposeManager.prototype.read).mockResolvedValue({
            services: {
                'managed-human': {
                    container_name: 'managed_human',
                    image: 'node:20'
                }
                // unmanaged-human is missing
            }
        } as any);

        vi.mocked(GitManager.prototype.isRepository).mockResolvedValue(false);

        const projects = await listProjects();

        expect(projects).toHaveLength(1);
        expect(projects[0].name).toBe('managed');
    });

    it('should format output correctly in handler', async () => {
        vi.mocked(readdir).mockResolvedValue([
            { name: 'test-project', isDirectory: () => true } as any
        ]);

        vi.mocked(DockerComposeManager.prototype.read).mockResolvedValue({
            services: {
                'test-project-human': {
                    container_name: 'test_project_human',
                    image: 'node:20'
                }
            }
        } as any);

        vi.mocked(GitManager.prototype.isRepository).mockResolvedValue(true);

        const result = await listProjectsTool.handler({});

        expect(result.isError).toBeUndefined();
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found 1 project(s)');
        expect(result.content[0].text).toContain('📦 test-project');
        expect(result.content[0].text).toContain('Service: test-project-human');
    });

    it('should handle errors gracefully', async () => {
        vi.mocked(readdir).mockRejectedValue(new Error('Permission denied'));

        const result = await listProjectsTool.handler({});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Permission denied');
    });
});
