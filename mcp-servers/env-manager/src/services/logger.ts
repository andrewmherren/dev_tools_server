// Simple logger service for env-manager

enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

class Logger {
    private level: LogLevel;

    constructor() {
        this.level = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
    }

    private parseLogLevel(level: string): LogLevel {
        switch (level.toLowerCase()) {
            case 'debug':
                return LogLevel.DEBUG;
            case 'info':
                return LogLevel.INFO;
            case 'warn':
                return LogLevel.WARN;
            case 'error':
                return LogLevel.ERROR;
            default:
                return LogLevel.INFO;
        }
    }

    private log(level: LogLevel, levelName: string, message: string, meta?: any) {
        if (level < this.level) return;

        const entry = {
            timestamp: new Date().toISOString(),
            level: levelName,
            message,
            ...meta
        };

        const line = JSON.stringify(entry);

        if (level >= LogLevel.WARN) {
            console.error(line);
        } else {
            console.log(line);
        }
    }

    debug(message: string, meta?: any) {
        this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
    }

    info(message: string, meta?: any) {
        this.log(LogLevel.INFO, 'INFO', message, meta);
    }

    warn(message: string, meta?: any) {
        this.log(LogLevel.WARN, 'WARN', message, meta);
    }

    error(message: string, error?: any) {
        const meta = error
            ? {
                error: error.message,
                stack: error.stack
            }
            : undefined;
        this.log(LogLevel.ERROR, 'ERROR', message, meta);
    }
}

export const logger = new Logger();
