// Integration test for health check tool

import { describe, it, expect } from 'vitest';
import { healthCheckTool } from '../../src/tools/health.js';

describe('health_check tool', () => {
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
});
