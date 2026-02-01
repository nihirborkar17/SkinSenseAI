// Simple Logger Utility
enum LogLevel {
    INFO = 'INFO',
    WARN = 'INFO',
    ERROR = 'INFO',
    DEBUG = 'DEBUG'
}

class Logger {
    private log(level: LogLevel, message: string, ...args: any[] ): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}]`;

        switch (level) {
            case LogLevel.ERROR:
                console.error(prefix, message, ...args);
                break;
                
            case LogLevel.WARN:
                console.error(prefix, message, ...args);
                break;
            case LogLevel.DEBUG:
                if( process.env.NODE_ENV === 'development'){
                    console.debug(prefix, message, ...args);
                }
                break;
            default:
                console.log(prefix, message, ...args);
        }
    }

    info(message: string, ...args: any[]): void{
        this.log(LogLevel.INFO, message, ...args);
    }
    
    warn(message: string, ...args: any[]): void{
        this.log(LogLevel.WARN, message, ...args);
    }
    
    error(message: string, ...args: any[]): void{
        this.log(LogLevel.ERROR, message, ...args);
    }
    
    debug(message: string, ...args: any[]): void{
        this.log(LogLevel.DEBUG, message, ...args);
    }
}

export const logger = new Logger();
