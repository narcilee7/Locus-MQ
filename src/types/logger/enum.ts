export enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5,
}

export enum LogFormat {
    JSON = 'json',
    TEXT = 'text',
    PRETTY = 'pretty'
}

export enum LogOutput {
    CONSOLE = 'console',
    FILE = 'file',
    HTTP = 'http',
    STREAM = 'stream'
}