// Integration test for health check tool

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { config } from '../../src/config.js';

vi.mock('fs');
vi.mock('../../src/services/docker-client.js', () => ({
    dockerClient: {
        ping: vi.fn()
    }
}));

import * as fs from 'fs';
import { dockerClient } from '../../src/services/docker-client.js';
import { healthCheckTool } from '../../src/tools/health.js';

describe('health_check tool', () => {
    beforeEach(() => {
        config.devEnvironmentRoot = '/dev_environment';
        config.sandboxRoot = '/sandbox';

        vi.mocked(fs.existsSync).mockImplementation((path) =>
            path === config.devEnvironmentRoot || path === config.sandboxRoot
        );

        vi.mocked(dockerClient.ping).mockResolvedValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return health status', async () => {
        const result = await healthCheckTool.handler({});

        expect(result).toHaveProperty('content');
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('docker_available');
        expect(data).toHaveProperty('dev_environment_accessible');
        expect(data).toHaveProperty('sandbox_accessible');
        expect(data).toHaveProperty('status');
        expect(['healthy', 'degraded']).toContain(data.status);
    });

    it('should include path information', async () => {
        const result = await healthCheckTool.handler({});
        const data = JSON.parse(result.content[0].text);

        expect(data).toHaveProperty('dev_environment_path');
        expect(data).toHaveProperty('sandbox_path');
    });

    it('should degrade when docker is unavailable', async () => {
        vi.mocked(dockerClient.ping).mockResolvedValue(false);

        const result = await healthCheckTool.handler({});
        const data = JSON.parse(result.content[0].text);

        expect(data.docker_available).toBe(false);
        expect(data.status).toBe('degraded');
    });
});
