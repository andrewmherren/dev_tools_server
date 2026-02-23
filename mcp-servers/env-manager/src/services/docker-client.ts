// Docker client service for interacting with Docker daemon

import { execa } from 'execa';
import { logger } from './logger.js';

export class DockerClient {
    /**
     * Check if Docker daemon is accessible
     */
    async ping(): Promise<boolean> {
        try {
            await execa('docker', ['info']);
            return true;
        } catch (error) {
            logger.error('Docker ping failed', error);
            return false;
        }
    }

    /**
     * Get Docker Compose version
     */
    async composeVersion(): Promise<string> {
        try {
            const { stdout } = await execa('docker', ['compose', 'version']);
            return stdout;
        } catch (error) {
            logger.error('Failed to get Docker Compose version', error);
            throw error;
        }
    }

    /**
     * Check if docker socket is accessible
     */
    async checkSocketAccess(): Promise<boolean> {
        try {
            await execa('docker', ['ps'], { timeout: 5000 });
            return true;
        } catch (error) {
            logger.error('Docker socket not accessible', error);
            return false;
        }
    }
}

export const dockerClient = new DockerClient();
