import { LoggerConfig } from "./config";
import { Logger } from "./instance";

export interface LoggerFactory {
    createLogger(name: string, config?: Partial<LoggerConfig>): Logger;
    getGlobalLogger(): Logger;
    setGlobalLogger(logger: Logger): void;
}

