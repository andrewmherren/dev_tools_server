// Configuration loader for env-manager MCP server

export interface Config {
    devEnvironmentRoot: string;
    sandboxRoot: string;
    logLevel: string;
    port: number;
}

export const config: Config = {
    devEnvironmentRoot: process.env.DEV_ENVIRONMENT_ROOT || '/dev_environment',
    sandboxRoot: process.env.SANDBOX_ROOT || '/sandbox',
    logLevel: process.env.LOG_LEVEL || 'info',
    port: parseInt(process.env.PORT || '7272', 10)
};
