import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import { logger } from './logger.js';

type ParsedEnvLine =
    | { kind: 'skip' }
    | { kind: 'invalid'; line: string }
    | { kind: 'entry'; key: string; value: string };

const stripOuterQuotes = (value: string): string => {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        return value.substring(1, value.length - 1);
    }

    return value;
};

const parseEnvLine = (line: string): ParsedEnvLine => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
        return { kind: 'skip' };
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
        return { kind: 'invalid', line: trimmed };
    }

    const key = trimmed.substring(0, equalIndex).trim();
    const rawValue = trimmed.substring(equalIndex + 1).trim();

    return { kind: 'entry', key, value: stripOuterQuotes(rawValue) };
};

/**
 * EnvManager handles reading and writing .env files
 * with proper formatting and validation
 */
export class EnvManager {
    private readonly filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    /**
     * Read and parse .env file into key-value pairs
     */
    async read(): Promise<Record<string, string>> {
        try {
            // Check if file exists
            await access(this.filePath, constants.F_OK);

            const content = await readFile(this.filePath, 'utf-8');
            const env: Record<string, string> = {};

            // Parse line by line
            const lines = content.split('\n');
            for (const line of lines) {
                const parsed = parseEnvLine(line);

                if (parsed.kind === 'skip') {
                    continue;
                }

                if (parsed.kind === 'invalid') {
                    logger.warn('Skipping invalid .env line', { line: parsed.line });
                    continue;
                }

                env[parsed.key] = parsed.value;
            }

            logger.debug('Parsed .env file', {
                filePath: this.filePath,
                keyCount: Object.keys(env).length
            });

            return env;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                logger.debug('.env file does not exist', { filePath: this.filePath });
                return {};
            }

            logger.error('Failed to read .env file', {
                filePath: this.filePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to read .env file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Write environment variables to .env file
     */
    async write(env: Record<string, string>): Promise<void> {
        try {
            const lines: string[] = [
                '# Environment variables',
                `# Generated: ${new Date().toISOString()}`,
                ''
            ];

            // Sort keys alphabetically for consistency
            const sortedKeys = Object.keys(env).sort((a, b) => a.localeCompare(b));

            for (const key of sortedKeys) {
                const value = env[key];

                // Validate key format (alphanumeric and underscore only)
                if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
                    throw new Error(`Invalid environment variable key: ${key}`);
                }

                // Quote value if it contains special characters
                const needsQuotes = /[\s#$"'\\]/.test(value);
                const formattedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;

                lines.push(`${key}=${formattedValue}`);
            }

            // Add trailing newline
            lines.push('');

            await writeFile(this.filePath, lines.join('\n'), 'utf-8');

            logger.info('Wrote .env file', {
                filePath: this.filePath,
                keyCount: Object.keys(env).length
            });
        } catch (error) {
            logger.error('Failed to write .env file', {
                filePath: this.filePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to write .env file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Set a single environment variable
     */
    async set(key: string, value: string): Promise<void> {
        const env = await this.read();
        env[key] = value;
        await this.write(env);

        logger.info('Set environment variable', { key, filePath: this.filePath });
    }

    /**
     * Get a single environment variable
     */
    async get(key: string): Promise<string | undefined> {
        const env = await this.read();
        return env[key];
    }

    /**
     * Delete an environment variable
     */
    async delete(key: string): Promise<boolean> {
        const env = await this.read();

        if (!(key in env)) {
            return false;
        }

        delete env[key];
        await this.write(env);

        logger.info('Deleted environment variable', { key, filePath: this.filePath });
        return true;
    }

    /**
     * Check if an environment variable exists
     */
    async has(key: string): Promise<boolean> {
        const env = await this.read();
        return key in env;
    }

    /**
     * Merge new environment variables with existing ones
     */
    async merge(newEnv: Record<string, string>): Promise<void> {
        const existingEnv = await this.read();
        const mergedEnv = { ...existingEnv, ...newEnv };
        await this.write(mergedEnv);

        logger.info('Merged environment variables', {
            filePath: this.filePath,
            newKeys: Object.keys(newEnv).length
        });
    }

    /**
     * Check if .env file exists
     */
    async exists(): Promise<boolean> {
        try {
            await access(this.filePath, constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create a backup of the current .env file
     */
    async backup(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${this.filePath}.backup.${timestamp}`;

        try {
            const content = await readFile(this.filePath, 'utf-8');
            await writeFile(backupPath, content, 'utf-8');

            logger.info('Created .env backup', { backupPath });
            return backupPath;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                logger.debug('No .env file to backup', { filePath: this.filePath });
                return '';
            }
            throw error;
        }
    }

    /**
     * Restore from a backup file
     */
    async restore(backupPath: string): Promise<void> {
        const content = await readFile(backupPath, 'utf-8');
        await writeFile(this.filePath, content, 'utf-8');

        logger.info('Restored .env from backup', { backupPath });
    }
}
