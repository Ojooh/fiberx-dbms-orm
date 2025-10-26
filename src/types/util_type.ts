
export type LogLevel = "INFO" | "ERROR" | "ALERT" | "SUCCESS";

export interface LogObject { timestamp: string; status: LogLevel; message: string; data_error: any; }

export type EventListener<T = any> = (data: T, options?: Record<string, any>) => void;

export interface QueryCacheItemInterface {
    query?: string;
    queries?: Record<string, string>; // e.g., { data, count }
    created_at: number;
    last_accessed: number;
}

export interface QueryCacheOptionsInterface {
    enabled?: boolean;
    ttl_ms?: number;       // Time-to-live for cache entries
    max_entries?: number;  // Optional max size
}