// Unit tests for DockerComposeManager

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('fs/promises');
vi.mock('yaml');

import { readFile, writeFile } from 'fs/promises';
import { parse, stringify } from 'yaml';
import { DockerComposeManager } from '../../../src/services/docker-compose-manager.js';
import type { DockerComposeConfig, ServiceDefinition } from '../../../src/types.js';

describe('DockerComposeManager', () => {
    let manager: DockerComposeManager;
    const testFilePath = '/test/docker-compose.yml';

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new DockerComposeManager(testFilePath);
    });

    describe('read', () => {
        it('should read and parse docker-compose file', async () => {
            const mockConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': {
                        image: 'node:20',
                        container_name: 'web_container'
                    }
                }
            };

            vi.mocked(readFile).mockResolvedValue('version: "3.8"\nservices:\n  web:\n    image: node:20');
            vi.mocked(parse).mockReturnValue(mockConfig);

            const result = await manager.read();

            expect(result).toEqual(mockConfig);
            expect(readFile).toHaveBeenCalledWith(testFilePath, 'utf-8');
        });

        it('should throw error when services section is missing', async () => {
            vi.mocked(readFile).mockResolvedValue('version: "3.8"');
            vi.mocked(parse).mockReturnValue({ version: '3.8' } as any);

            await expect(manager.read()).rejects.toThrow('missing services section');
        });

        it('should throw error when file read fails', async () => {
            vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

            await expect(manager.read()).rejects.toThrow('Failed to read docker-compose.yml');
        });
    });

    describe('write', () => {
        it('should write docker-compose configuration', async () => {
            const config: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': {
                        image: 'node:20'
                    }
                }
            };

            vi.mocked(stringify).mockReturnValue('version: "3.8"\nservices:\n  web:\n    image: node:20\n');

            await manager.write(config);

            expect(stringify).toHaveBeenCalledWith(config, expect.objectContaining({
                indent: 2
            }));
            expect(writeFile).toHaveBeenCalledWith(testFilePath, expect.any(String), 'utf-8');
        });

        it('should throw error when services is empty', async () => {
            const config: DockerComposeConfig = {
                version: '3.8',
                services: {}
            };

            await expect(manager.write(config)).rejects.toThrow('services section is empty');
        });

        it('should throw error when write fails', async () => {
            const config: DockerComposeConfig = {
                version: '3.8',
                services: { 'web': { image: 'node:20' } }
            };

            vi.mocked(stringify).mockReturnValue('yaml content');
            vi.mocked(writeFile).mockRejectedValue(new Error('EACCES'));

            await expect(manager.write(config)).rejects.toThrow('Failed to write docker-compose.yml');
        });
    });

    describe('addService', () => {
        it('should add a new service', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'existing': { image: 'nginx:latest' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);
            vi.mocked(stringify).mockReturnValue('updated yaml');
            vi.mocked(writeFile).mockResolvedValue(undefined);

            const newService: ServiceDefinition = {
                image: 'node:20',
                container_name: 'new_container'
            };

            await manager.addService('new-service', newService);

            expect(writeFile).toHaveBeenCalled();
            const writeCall = vi.mocked(stringify).mock.calls[0][0] as DockerComposeConfig;
            expect(writeCall.services['new-service']).toEqual(newService);
        });

        it('should throw error when service already exists', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'existing': { image: 'nginx:latest' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);

            await expect(manager.addService('existing', { image: 'node:20' }))
                .rejects.toThrow("Service 'existing' already exists");
        });
    });

    describe('removeService', () => {
        it('should remove an existing service', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': { image: 'node:20' },
                    'db': { image: 'postgres:15' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);
            vi.mocked(stringify).mockReturnValue('updated yaml');
            vi.mocked(writeFile).mockResolvedValue(undefined);

            await manager.removeService('web');

            const writeCall = vi.mocked(stringify).mock.calls[0][0] as DockerComposeConfig;
            expect(writeCall.services['web']).toBeUndefined();
            expect(writeCall.services['db']).toBeDefined();
        });

        it('should throw error when service does not exist', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': { image: 'node:20' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);

            await expect(manager.removeService('nonexistent'))
                .rejects.toThrow("Service 'nonexistent' does not exist");
        });
    });

    describe('updateService', () => {
        it('should update an existing service', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': {
                        image: 'node:18',
                        container_name: 'old_name'
                    }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);
            vi.mocked(stringify).mockReturnValue('updated yaml');
            vi.mocked(writeFile).mockResolvedValue(undefined);

            await manager.updateService('web', { image: 'node:20' });

            const writeCall = vi.mocked(stringify).mock.calls[0][0] as DockerComposeConfig;
            expect(writeCall.services['web'].image).toBe('node:20');
            expect(writeCall.services['web'].container_name).toBe('old_name'); // preserved
        });

        it('should throw error when service does not exist', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': { image: 'node:20' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);

            await expect(manager.updateService('nonexistent', { image: 'node:20' }))
                .rejects.toThrow("Service 'nonexistent' does not exist");
        });
    });

    describe('getService', () => {
        it('should return service configuration when it exists', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': { image: 'node:20' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);

            const service = await manager.getService('web');

            expect(service).toEqual({ image: 'node:20' });
        });

        it('should return null when service does not exist', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': { image: 'node:20' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);

            const service = await manager.getService('nonexistent');

            expect(service).toBeNull();
        });
    });

    describe('listServices', () => {
        it('should list all service names', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': { image: 'node:20' },
                    'db': { image: 'postgres:15' },
                    'cache': { image: 'redis:7' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);

            const services = await manager.listServices();

            expect(services).toEqual(['web', 'db', 'cache']);
        });
    });

    describe('hasService', () => {
        it('should return true when service exists', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': { image: 'node:20' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);

            const exists = await manager.hasService('web');

            expect(exists).toBe(true);
        });

        it('should return false when service does not exist', async () => {
            const existingConfig: DockerComposeConfig = {
                version: '3.8',
                services: {
                    'web': { image: 'node:20' }
                }
            };

            vi.mocked(readFile).mockResolvedValue('yaml');
            vi.mocked(parse).mockReturnValue(existingConfig);

            const exists = await manager.hasService('nonexistent');

            expect(exists).toBe(false);
        });
    });

    describe('backup', () => {
        it('should create a backup file', async () => {
            const content = 'version: "3.8"\nservices:\n  web:\n    image: node:20';
            vi.mocked(readFile).mockResolvedValue(content);
            vi.mocked(writeFile).mockResolvedValue(undefined);

            const backupPath = await manager.backup();

            expect(backupPath).toMatch(/docker-compose\.yml\.backup\./);
            expect(writeFile).toHaveBeenCalledWith(
                backupPath,
                content,
                'utf-8'
            );
        });
    });

    describe('restore', () => {
        it('should restore from backup file', async () => {
            const backupContent = 'version: "3.8"\nservices:\n  web:\n    image: node:18';
            const backupPath = '/test/docker-compose.yml.backup.2026-01-01';

            vi.mocked(readFile).mockResolvedValue(backupContent);
            vi.mocked(writeFile).mockResolvedValue(undefined);

            await manager.restore(backupPath);

            expect(readFile).toHaveBeenCalledWith(backupPath, 'utf-8');
            expect(writeFile).toHaveBeenCalledWith(testFilePath, backupContent, 'utf-8');
        });
    });
});
