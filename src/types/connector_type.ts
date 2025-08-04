
export interface ConnectionParams { 
    host: string; port?: number; username: string; password: string; database_name?: string; 
    wait_for_connection?: boolean, connection_limit?: number, queue_limit?: number
};

export interface QueryParams { transaction_id?: string }

export interface ExecuteQueryResult { 
    success: boolean; 
    rows: any[];
    affected_rows?: number;
    changed_rows?: number;
    insert_id?: number;
}