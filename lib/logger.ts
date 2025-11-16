// Client-safe logger that works in both browser and Node.js environments

// Only import Node.js modules when running on the server
let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;

const isServer =
  typeof window === 'undefined' && typeof process !== 'undefined';

// Initialize Node.js modules on server-side
async function initializeNodeModules() {
  if (isServer && !fs && !path) {
    try {
      fs = await import('fs');
      path = await import('path');
    } catch (error) {
      console.warn('Failed to load Node.js fs/path modules:', error);
    }
  }
}

interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

class Logger {
  private logDir: string;
  private logFile: string;
  private errorFile: string;
  private isServer: boolean;
  private initialized: boolean = false;

  constructor() {
    this.isServer = isServer;
    this.logDir = '';
    this.logFile = '';
    this.errorFile = '';

    // Initialize asynchronously on server-side
    if (this.isServer) {
      // Use setImmediate to avoid blocking the constructor
      setImmediate(() => {
        this.initializeServer().catch(() => {
          // Silently handle initialization errors
        });
      });
    }
  }

  private async initializeServer() {
    if (this.initialized) return;

    await initializeNodeModules();

    // Check if we're in Vercel environment (read-only filesystem)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_URL;

    if (fs && path && !isVercel) {
      this.logDir = path.join(process.cwd(), 'logs');
      this.logFile = path.join(this.logDir, `app-${this.getDateString()}.log`);
      this.errorFile = path.join(
        this.logDir,
        `error-${this.getDateString()}.log`
      );

      // Ensure logs directory exists (only in non-Vercel environments)
      try {
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
      } catch (error) {
        console.warn(
          'Cannot create logs directory, using console logging only:',
          error
        );
        this.logDir = '';
        this.logFile = '';
        this.errorFile = '';
      }
    } else if (isVercel) {
      // In Vercel, disable file logging
      this.logDir = '';
      this.logFile = '';
      this.errorFile = '';
    }

    this.initialized = true;
  }

  private getDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').replace('Z', '');
  }

  private async writeToFile(filePath: string, message: string): Promise<void> {
    // Only write to file on server-side
    if (!this.isServer || !filePath) {
      return;
    }

    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initializeServer();
    }

    if (!fs) {
      return;
    }

    try {
      const logEntry = `[${this.getTimestamp()}] ${message}\n`;
      fs.appendFileSync(filePath, logEntry, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private formatMessage(
    level: string,
    message: string,
    ...args: unknown[]
  ): string {
    const argsStr =
      args.length > 0
        ? ' ' +
          args
            .map(arg =>
              typeof arg === 'object'
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(' ')
        : '';
    return `[${level.toUpperCase()}] ${message}${argsStr}`;
  }

  error(message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage(
      LOG_LEVELS.ERROR,
      message,
      ...args
    );
    this.writeToFile(this.errorFile, formattedMessage).catch(() => {});
    this.writeToFile(this.logFile, formattedMessage).catch(() => {});
    // Still show errors in console for immediate feedback
    console.error(formattedMessage);
  }

  warn(message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage(
      LOG_LEVELS.WARN,
      message,
      ...args
    );
    this.writeToFile(this.logFile, formattedMessage).catch(() => {});
    // Show warnings in console for development
    if (process.env.NODE_ENV === 'development') {
      console.warn(formattedMessage);
    }
  }

  info(message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage(
      LOG_LEVELS.INFO,
      message,
      ...args
    );
    this.writeToFile(this.logFile, formattedMessage).catch(() => {});
    // Only show info in console during development
    if (process.env.NODE_ENV === 'development') {
      console.info(formattedMessage);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    const formattedMessage = this.formatMessage(
      LOG_LEVELS.DEBUG,
      message,
      ...args
    );
    this.writeToFile(this.logFile, formattedMessage).catch(() => {});
    // Only show debug in console during development
    if (process.env.NODE_ENV === 'development') {
      console.debug(formattedMessage);
    }
  }

  // Log API requests and responses
  apiRequest(
    method: string,
    url: string,
    data?: Record<string, unknown>
  ): void {
    const message = `API Request: ${method} ${url}`;
    const args = data ? [data] : [];
    this.info(message, ...args);
  }

  apiResponse(
    method: string,
    url: string,
    status: number,
    data?: Record<string, unknown>
  ): void {
    const message = `API Response: ${method} ${url} - ${status}`;
    const args = data ? [data] : [];
    if (status >= 400) {
      this.error(message, ...args);
    } else {
      this.info(message, ...args);
    }
  }

  // Log music-related events
  musicEvent(event: string, details?: Record<string, unknown>): void {
    const message = `Music Event: ${event}`;
    const args = details ? [details] : [];
    this.info(message, ...args);
  }

  // Log search events
  searchEvent(query: string, results: number, source: string): void {
    const message = `Search: "${query}" - ${results} results from ${source}`;
    this.info(message);
  }

  // Clean up old log files (keep last 7 days) - server-side only
  async cleanupOldLogs(): Promise<void> {
    if (!this.isServer || !this.logDir) {
      return;
    }

    // Ensure initialization is complete
    if (!this.initialized) {
      await this.initializeServer();
    }

    if (!fs || !path) {
      return;
    }

    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      files.forEach(file => {
        if (!fs || !path) return;

        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`Cleaned up old log file: ${file}`);
        }
      });
    } catch (error) {
      this.error('Failed to cleanup old logs:', error);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for TypeScript
export type { LogLevel };
