import { SchemaDefinition  } from "./model_type";
import LoggerUtil from "../utils/logger_util";

export interface ConnectionInfo {
    wait_for_connection?: boolean;
    connection_limit?: number;
    queue_limit?: number;
    [key: string]: any;
}

export interface DatasourceRecord {
    id: number;
    name: string;
    type: string; // mysql, postgres, etc.
    host: string;
    username: string;
    password: string;
    database_name: string;
    connection_info?: ConnectionInfo;
    wait_for_connection?: boolean;
    connection_limit?: number;
    queue_limit?: number;
    [key: string]: any;
}

export interface BootstrapResponse {
    datasources: DatasourceRecord[];
    schemas: SchemaDefinition[];
}

export interface BootstrapClientConfig {
    app_id: string;
    api_key: string;
    dbms_url: string;
    logger?: LoggerUtil;
}

