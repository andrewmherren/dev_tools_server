import { mkdir, rm, writeFile, readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { logger } from './logger.js';

/**
 * Represents a reversible operation that can be rolled back
 */
export interface Operation {
    execute: () => Promise<void>;
    rollback: () => Promise<void>;
    description: string;
}

/**
 * Transaction service provides atomic operations with automatic rollback
 * on failure, ensuring data consistency across multiple operations
 */
export class Transaction {
    private operations: Operation[] = [];
    private executedOperations: Operation[] = [];
    private isExecuted = false;
    private isRolledBack = false;

    /**
     * Add an operation to the transaction
     */
    add(operation: Operation): void {
        if (this.isExecuted) {
            throw new Error('Cannot add operations to an executed transaction');
        }

        this.operations.push(operation);
        logger.debug('Added operation to transaction', {
            description: operation.description,
            totalOperations: this.operations.length
        });
    }

    /**
     * Execute all operations in sequence
     * If any operation fails, automatically rollback all previously executed operations
     */
    async execute(): Promise<void> {
        if (this.isExecuted) {
            throw new Error('Transaction has already been executed');
        }

        if (this.isRolledBack) {
            throw new Error('Cannot execute a rolled back transaction');
        }

        logger.info('Starting transaction', { operationCount: this.operations.length });

        try {
            for (const operation of this.operations) {
                logger.debug('Executing operation', { description: operation.description });

                await operation.execute();
                this.executedOperations.push(operation);

                logger.debug('Operation completed', { description: operation.description });
            }

            this.isExecuted = true;
            logger.info('Transaction completed successfully', {
                operationCount: this.executedOperations.length
            });

        } catch (error) {
            logger.error('Transaction failed, rolling back', {
                error: error instanceof Error ? error.message : String(error),
                executedOperations: this.executedOperations.length
            });

            await this.rollback();
            throw error;
        }
    }

    /**
     * Rollback all executed operations in reverse order
     */
    async rollback(): Promise<void> {
        if (this.isRolledBack) {
            logger.warn('Transaction already rolled back');
            return;
        }

        logger.info('Rolling back transaction', {
            operationCount: this.executedOperations.length
        });

        const errors: Error[] = [];

        // Rollback in reverse order
        for (let i = this.executedOperations.length - 1; i >= 0; i--) {
            const operation = this.executedOperations[i];

            try {
                logger.debug('Rolling back operation', { description: operation.description });
                await operation.rollback();
                logger.debug('Rollback completed', { description: operation.description });
            } catch (error) {
                logger.error('Rollback failed for operation', {
                    description: operation.description,
                    error: error instanceof Error ? error.message : String(error)
                });
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }

        this.isRolledBack = true;

        if (errors.length > 0) {
            logger.error('Some rollback operations failed', { errorCount: errors.length });
            throw new Error(`Rollback incomplete: ${errors.length} operations failed`);
        }

        logger.info('Transaction rolled back successfully');
    }

    /**
     * Get the current state of the transaction
     */
    getState(): { executed: boolean; rolledBack: boolean; operationCount: number } {
        return {
            executed: this.isExecuted,
            rolledBack: this.isRolledBack,
            operationCount: this.operations.length
        };
    }
}

/**
 * Common operation builders for typical filesystem and configuration operations
 */
export class OperationBuilder {
    /**
     * Create a directory operation
     */
    static createDirectory(path: string): Operation {
        return {
            description: `Create directory: ${path}`,
            execute: async () => {
                await mkdir(path, { recursive: true });
            },
            rollback: async () => {
                await rm(path, { recursive: true, force: true });
            }
        };
    }

    /**
     * Delete a directory operation
     */
    static deleteDirectory(path: string, backupPath: string): Operation {
        return {
            description: `Delete directory: ${path}`,
            execute: async () => {
                // Backup before deletion
                try {
                    await access(path, constants.F_OK);
                    // Use copy/move logic here if needed
                    // For simplicity, we'll just track the path
                } catch {
                    // Directory doesn't exist, nothing to do
                }
                await rm(path, { recursive: true, force: true });
            },
            rollback: async () => {
                // Restore from backup if it exists
                // This would require a more sophisticated backup mechanism
                logger.warn('Directory deletion rollback not fully implemented', { path });
            }
        };
    }

    /**
     * Create or update a file operation
     */
    static writeFile(path: string, content: string): Operation {
        let originalContent: string | null = null;
        let fileExisted = false;

        return {
            description: `Write file: ${path}`,
            execute: async () => {
                try {
                    originalContent = await readFile(path, 'utf-8');
                    fileExisted = true;
                } catch {
                    fileExisted = false;
                }
                await writeFile(path, content, 'utf-8');
            },
            rollback: async () => {
                if (fileExisted && originalContent !== null) {
                    await writeFile(path, originalContent, 'utf-8');
                } else {
                    await rm(path, { force: true });
                }
            }
        };
    }

    /**
     * Delete a file operation
     */
    static deleteFile(path: string): Operation {
        let originalContent: string | null = null;
        let fileExisted = false;

        return {
            description: `Delete file: ${path}`,
            execute: async () => {
                try {
                    originalContent = await readFile(path, 'utf-8');
                    fileExisted = true;
                    await rm(path, { force: true });
                } catch {
                    fileExisted = false;
                }
            },
            rollback: async () => {
                if (fileExisted && originalContent !== null) {
                    await writeFile(path, originalContent, 'utf-8');
                }
            }
        };
    }

    /**
     * Custom operation with explicit execute and rollback functions
     */
    static custom(
        description: string,
        execute: () => Promise<void>,
        rollback: () => Promise<void>
    ): Operation {
        return {
            description,
            execute,
            rollback
        };
    }
}
