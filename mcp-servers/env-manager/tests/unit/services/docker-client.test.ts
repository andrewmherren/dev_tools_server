// Unit tests for DockerClient

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('execa');

import { execa } from 'execa';
import { DockerClient } from '../../../src/services/docker-client.js';

describe('DockerClient', () => {
    let client: DockerClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new DockerClient();
    });

    describe('ping', () => {
        it('should return true when docker info succeeds', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: 'Docker info', stderr: '', exitCode: 0 } as any);

            const result = await client.ping();

            expect(result).toBe(true);
            expect(execa).toHaveBeenCalledWith('docker', ['info']);
        });

        it('should return false when docker info fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Docker not running'));

            const result = await client.ping();

            expect(result).toBe(false);
        });
    });

    describe('composeVersion', () => {
        it('should return docker compose version', async () => {
            const version = 'Docker Compose version v2.20.0';
            vi.mocked(execa).mockResolvedValue({ stdout: version, stderr: '', exitCode: 0 } as any);

            const result = await client.composeVersion();

            expect(result).toBe(version);
            expect(execa).toHaveBeenCalledWith('docker', ['compose', 'version']);
        });

        it('should throw error when getting version fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Command not found'));

            await expect(client.composeVersion()).rejects.toThrow();
        });
    });

    describe('checkSocketAccess', () => {
        it('should return true when docker ps succeeds', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: 'CONTAINER ID', stderr: '', exitCode: 0 } as any);

            const result = await client.checkSocketAccess();

            expect(result).toBe(true);
            expect(execa).toHaveBeenCalledWith('docker', ['ps'], { timeout: 5000 });
        });

        it('should return false when docker ps fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('Cannot connect to Docker daemon'));

            const result = await client.checkSocketAccess();

            expect(result).toBe(false);
        });
    });
});
