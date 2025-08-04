
export type LogLevel = "INFO" | "ERROR" | "ALERT" | "SUCCESS";

export interface LogObject { timestamp: string; status: LogLevel; message: string; data_error: any; }

export type EventListener<T = any> = (data: T, options?: Record<string, any>) => void;