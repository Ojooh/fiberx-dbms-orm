
export type SQLDialect = "mysql" | "postgres" | "sqlite";

export interface ConnectionParams { 
    name: string;
    datasource_type: SQLDialect;
    host: string;
    username: string;
    password: string;
    database_name: string;
    port: number;
    connection_info: {
        wait_for_connection?: boolean;
        connection_limit?: number;
        queue_limit?: number;
        pool_max?: number;
        pool_min?: number;
        idle_timeout?: number;
        connection_timeout?: number;
        charset?: string;
        collation?: string;
        [key: string]: any;
    };
};



export interface QueryParams { transaction_id?: string }

export interface ExecuteQueryResult { 
    success: boolean; 
    rows: any[];
    affected_rows?: number;
    changed_rows?: number;
    insert_id?: number;
}