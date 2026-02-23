import { z } from 'zod';

/**
 * Input validators for env-manager tools
 * Ensures all inputs meet security and format requirements
 */

// Project name validator
// - Must be 3-50 characters
// - Only lowercase letters, numbers, hyphens, and underscores
// - Must start with a letter
// - No consecutive hyphens or underscores
export const projectNameSchema = z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(50, 'Project name must be at most 50 characters')
    .regex(/^[a-z][a-z0-9_-]*$/, 'Project name must start with a letter and contain only lowercase letters, numbers, hyphens, and underscores')
    .regex(/^(?!.*[-_]{2}).*$/, 'Project name cannot contain consecutive hyphens or underscores')
    .refine(
        name => !name.endsWith('-') && !name.endsWith('_'),
        'Project name cannot end with a hyphen or underscore'
    );

// Git URL validator
// - Must be a valid HTTPS or SSH Git URL
// - GitHub only for security
export const gitUrlSchema = z
    .string()
    .url('Git URL must be a valid URL')
    .refine(
        url => url.startsWith('https://github.com/') || url.startsWith('git@github.com:'),
        'Only GitHub repositories are supported for security'
    )
    .refine(
        url => url.endsWith('.git'),
        'Git URL must end with .git'
    );

// Environment variable key validator
// - Must be uppercase letters, numbers, and underscores only
// - Must start with a letter
export const envKeySchema = z
    .string()
    .min(1, 'Environment variable key cannot be empty')
    .max(100, 'Environment variable key is too long')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Environment variable key must be uppercase letters, numbers, and underscores, starting with a letter');

// Environment variable value validator
// - Any string, but with reasonable length limit
export const envValueSchema = z
    .string()
    .max(10000, 'Environment variable value is too long');

// Container name validator
// - Docker container naming rules
export const containerNameSchema = z
    .string()
    .min(1, 'Container name cannot be empty')
    .max(63, 'Container name must be at most 63 characters')
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, 'Container name must start with alphanumeric and contain only alphanumeric, underscore, period, and hyphen');

// Service name validator (for docker-compose services)
export const serviceNameSchema = z
    .string()
    .min(1, 'Service name cannot be empty')
    .max(50, 'Service name must be at most 50 characters')
    .regex(/^[a-z][a-z0-9_-]*$/, 'Service name must start with lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores');

// Agent name validator
// - Similar to project name but allows more flexibility
export const agentNameSchema = z
    .string()
    .min(2, 'Agent name must be at least 2 characters')
    .max(30, 'Agent name must be at most 30 characters')
    .regex(/^[a-z][a-z0-9_-]*$/, 'Agent name must start with lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores');

// Path validator - prevents path traversal
export const safePathSchema = z
    .string()
    .min(1, 'Path cannot be empty')
    .refine(
        path => !path.includes('..') && !path.includes('~'),
        'Path cannot contain .. or ~ (path traversal prevention)'
    )
    .refine(
        path => !/[<>:"|?*\0]/.test(path),
        'Path contains invalid characters'
    );

// Docker image validator
export const dockerImageSchema = z
    .string()
    .min(1, 'Docker image cannot be empty')
    .regex(/^[a-z0-9][a-z0-9._/-]*:[a-z0-9._-]+$/, 'Docker image must be in format: name:tag');

// Port number validator
export const portSchema = z
    .number()
    .int('Port must be an integer')
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be at most 65535');

// Boolean confirmation validator
export const confirmSchema = z.boolean();

/**
 * Validation helper functions
 */

export class Validator {
    /**
     * Validate project name
     */
    static validateProjectName(name: string): { valid: boolean; error?: string } {
        try {
            projectNameSchema.parse(name);
            return { valid: true };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { valid: false, error: error.errors[0].message };
            }
            return { valid: false, error: 'Unknown validation error' };
        }
    }

    /**
     * Validate Git URL
     */
    static validateGitUrl(url: string): { valid: boolean; error?: string } {
        try {
            gitUrlSchema.parse(url);
            return { valid: true };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { valid: false, error: error.errors[0].message };
            }
            return { valid: false, error: 'Unknown validation error' };
        }
    }

    /**
     * Validate environment variable key
     */
    static validateEnvKey(key: string): { valid: boolean; error?: string } {
        try {
            envKeySchema.parse(key);
            return { valid: true };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { valid: false, error: error.errors[0].message };
            }
            return { valid: false, error: 'Unknown validation error' };
        }
    }

    /**
     * Validate environment variable value
     */
    static validateEnvValue(value: string): { valid: boolean; error?: string } {
        try {
            envValueSchema.parse(value);
            return { valid: true };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { valid: false, error: error.errors[0].message };
            }
            return { valid: false, error: 'Unknown validation error' };
        }
    }

    /**
     * Validate agent name
     */
    static validateAgentName(name: string): { valid: boolean; error?: string } {
        try {
            agentNameSchema.parse(name);
            return { valid: true };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { valid: false, error: error.errors[0].message };
            }
            return { valid: false, error: 'Unknown validation error' };
        }
    }

    /**
     * Validate container name
     */
    static validateContainerName(name: string): { valid: boolean; error?: string } {
        try {
            containerNameSchema.parse(name);
            return { valid: true };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { valid: false, error: error.errors[0].message };
            }
            return { valid: false, error: 'Unknown validation error' };
        }
    }

    /**
     * Sanitize user input by removing potentially dangerous characters
     */
    static sanitizeInput(input: string): string {
        return input
            .replace(/[<>:"|?*\0]/g, '') // Remove invalid filename characters
            .replace(/\.\./g, '') // Remove path traversal
            .trim();
    }
}

/**
 * Zod schemas for tool input validation
 */

export const createProjectInputSchema = z.object({
    name: projectNameSchema,
    gitUrl: gitUrlSchema.optional(),
    image: dockerImageSchema.optional(),
    envVars: z.record(envKeySchema, envValueSchema).optional(),
    confirm: confirmSchema.optional()
});

export const deleteProjectInputSchema = z.object({
    name: projectNameSchema,
    confirm: confirmSchema.optional()
});

export const addAgentInputSchema = z.object({
    projectName: projectNameSchema,
    agentName: agentNameSchema,
    branch: z.string().min(1).optional(),
    confirm: confirmSchema.optional()
});

export const removeAgentInputSchema = z.object({
    projectName: projectNameSchema,
    agentName: agentNameSchema,
    deleteWorktree: z.boolean().optional(),
    confirm: confirmSchema.optional()
});

export const updateEnvInputSchema = z.object({
    projectName: projectNameSchema,
    key: envKeySchema,
    value: envValueSchema,
    confirm: confirmSchema.optional()
});

export const projectOperationInputSchema = z.object({
    name: projectNameSchema
});

/**
 * Type exports for tool inputs
 */
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type DeleteProjectInput = z.infer<typeof deleteProjectInputSchema>;
export type AddAgentInput = z.infer<typeof addAgentInputSchema>;
export type RemoveAgentInput = z.infer<typeof removeAgentInputSchema>;
export type UpdateEnvInput = z.infer<typeof updateEnvInputSchema>;
export type ProjectOperationInput = z.infer<typeof projectOperationInputSchema>;
