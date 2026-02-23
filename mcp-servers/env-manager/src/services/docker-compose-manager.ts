import { readFile, writeFile } from 'fs/promises';
import { parse, stringify } from 'yaml';
import { logger } from './logger.js';
import type { DockerComposeConfig, ServiceDefinition } from '../types.js';

/**
 * DockerComposeManager handles reading and writing docker-compose.yml files
 * with proper validation and error handling
 */
export class DockerComposeManager {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    /**
     * Read and parse docker-compose.yml
     */
    async read(): Promise<DockerComposeConfig> {
        try {
            const content = await readFile(this.filePath, 'utf-8');
            const parsed = parse(content) as DockerComposeConfig;

            if (!parsed.services) {
                throw new Error('Invalid docker-compose.yml: missing services section');
            }

            logger.debug('Parsed docker-compose.yml', {
                serviceCount: Object.keys(parsed.services).length
            });

            return parsed;
        } catch (error) {
            logger.error('Failed to read docker-compose.yml', {
                filePath: this.filePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to read docker-compose.yml: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Write docker-compose configuration to file
     */
    async write(config: DockerComposeConfig): Promise<void> {
        try {
            // Validate config has services
            if (!config.services || Object.keys(config.services).length === 0) {
                throw new Error('Invalid configuration: services section is empty');
            }

            const content = stringify(config, {
                indent: 2,
                lineWidth: 0, // Disable line wrapping
                minContentWidth: 0
            });

            await writeFile(this.filePath, content, 'utf-8');

            logger.info('Wrote docker-compose.yml', {
                filePath: this.filePath,
                serviceCount: Object.keys(config.services).length
            });
        } catch (error) {
            logger.error('Failed to write docker-compose.yml', {
                filePath: this.filePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to write docker-compose.yml: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Add a new service to docker-compose.yml
     */
    async addService(serviceName: string, serviceConfig: ServiceDefinition): Promise<void> {
        const config = await this.read();

        // Check if service already exists
        if (config.services[serviceName]) {
            throw new Error(`Service '${serviceName}' already exists`);
        }

        config.services[serviceName] = serviceConfig;
        await this.write(config);

        logger.info('Added service to docker-compose.yml', { serviceName });
    }

    /**
     * Remove a service from docker-compose.yml
     */
    async removeService(serviceName: string): Promise<void> {
        const config = await this.read();

        if (!config.services[serviceName]) {
            throw new Error(`Service '${serviceName}' does not exist`);
        }

        delete config.services[serviceName];
        await this.write(config);

        logger.info('Removed service from docker-compose.yml', { serviceName });
    }

    /**
     * Update an existing service
     */
    async updateService(serviceName: string, serviceConfig: Partial<ServiceDefinition>): Promise<void> {
        const config = await this.read();

        if (!config.services[serviceName]) {
            throw new Error(`Service '${serviceName}' does not exist`);
        }

        config.services[serviceName] = {
            ...config.services[serviceName],
            ...serviceConfig
        };

        await this.write(config);

        logger.info('Updated service in docker-compose.yml', { serviceName });
    }

    /**
     * Get a specific service configuration
     */
    async getService(serviceName: string): Promise<ServiceDefinition | null> {
        const config = await this.read();
        return config.services[serviceName] || null;
    }

    /**
     * List all service names
     */
    async listServices(): Promise<string[]> {
        const config = await this.read();
        return Object.keys(config.services);
    }

    /**
     * Check if a service exists
     */
    async hasService(serviceName: string): Promise<boolean> {
        const config = await this.read();
        return serviceName in config.services;
    }

    /**
     * Create a backup of the current docker-compose.yml
     */
    async backup(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${this.filePath}.backup.${timestamp}`;

        const content = await readFile(this.filePath, 'utf-8');
        await writeFile(backupPath, content, 'utf-8');

        logger.info('Created docker-compose.yml backup', { backupPath });
        return backupPath;
    }

    /**
     * Restore from a backup file
     */
    async restore(backupPath: string): Promise<void> {
        const content = await readFile(backupPath, 'utf-8');
        await writeFile(this.filePath, content, 'utf-8');

        logger.info('Restored docker-compose.yml from backup', { backupPath });
    }
}
