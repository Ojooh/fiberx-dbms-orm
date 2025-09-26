
import { Pool, PoolClient } from "pg";

import BaseSQLConnector from "../base_sql_connector";
import BaseSQLAdmin from "../../management/base_sql_admin";
import SQLAdmin from "../../management/implementations/sql_admin";
import LoggerUtil from "../../../utils/logger_util";
import UUIDGeneratorUtil from "../../../utils/uuid_gen_util";
import QueryBuilderMapper from "../../../query_builders/query_builder_mapper";
import SQLQueryBuilder from "../../../query_builders/base_sql_query_builder";
import InputTransformerUtil from "../../../utils/input_transformer_util";

import { 
    ConnectionParams, 
    QueryParams, 
    ExecuteQueryResult 
} from "../../../types/connector_type";

class PostgresConnector implements BaseSQLConnector {
    private static instance: PostgresConnector;
    private readonly module_name: string;
    private logger: LoggerUtil;
    private readonly pools: Map<string, Pool | PoolClient>;
    public query_builder: SQLQueryBuilder;
    public sql_admin: BaseSQLAdmin;
    public model_name: string;

    constructor( logger?: LoggerUtil) {
        this.module_name        = "postgres_connector";
        this.pools              = new Map();

        this.logger             = logger ?? new LoggerUtil(this.module_name, true);
        this.query_builder      = QueryBuilderMapper.getQueryBuilder("postgres");
        this.sql_admin          = new SQLAdmin(this, this.logger);
        this.model_name         = "";
    }

    // Method to handle error
    private handleError(method: string, error: unknown): never {
        const error_obj = error instanceof Error ? error : new Error("Unknown error");
        this.logger.error(`[${this.module_name}] Error in ${method}: ${error_obj.message}`, { error_obj });
        throw error_obj
    }

    // ✅ Singleton instance accessor
    public static getInstance(logger?: LoggerUtil): PostgresConnector {
        if (!PostgresConnector.instance) {
            PostgresConnector.instance = new PostgresConnector(logger);
        }
        return PostgresConnector.instance;
    }

    // Method to connect to a database and store the pool under "default"
    public connect = async (connection_params: ConnectionParams): Promise<boolean> => {
        try {
            if (this.pools.has("default")) {
                this.logger.info(`[${this.module_name}] "default" pool already exists.`);
                return true;
            }

            const { host, port, username: user, password, database_name: database, connection_info } = connection_params;
            const {
                wait_for_connection: waitForConnections = true, connection_limit: max = 10,
                queue_limit: queueLimit = 0, charset, collation
            } = connection_info

            const connection_config     = { host, port, user, password, database, max };
            const pool                  = new Pool (connection_config);

            this.pools.set("default", pool);

            this.logger.success(`[${this.module_name}] Connected to PostgreSQL`);

            if(database) { 
                const database_params = { database_name: database, collation, charset };
                const created = this.sql_admin.createNewDatabase(database_params);
                
                if(!created) {
                    throw new Error(`Failed to create Database ${database_params}`)
                }

                this.logger.success(`Database ${database} created sucessfully`)
            }

            return true;
        }
        catch (error: unknown){ this.handleError("connect", error); }
    }

    // Method to disconnect from database
    public disconnect = async (connection_id: string = "default"): Promise<boolean> => {
        try {
            const _connection_id = connection_id && connection_id != "" ? connection_id : "default";
            const connection_to_terminate = this.pools.get(_connection_id);

            if (!connection_to_terminate) {
                this.logger.error(`[${this.module_name}] Failed to close "${connection_id}" — it does not exist.`);
                return false;
            }

            if("release" in connection_to_terminate) { connection_to_terminate.release() } else { await connection_to_terminate.end(); }

            this.pools.delete(connection_id);
            this.logger.success(`[${this.module_name}] Disconnected "${connection_id}" successfully.`);

            return true;
        } 
        catch (error: unknown) { this.handleError("disconnect", error); }
    };

    // Method to begin a transaction
    public beginTransaction  = async (): Promise<string> => {
        try {
            const default_pool = this.pools.get("default") as Pool;

            if (!default_pool) { throw new Error("Default pool not found"); }

            const conn = await default_pool.connect();

            await conn.query("BEGIN");

            const transaction_id = UUIDGeneratorUtil.generateUUIDV4("TXN");
            this.pools.set(transaction_id, conn);

            this.logger.success(`[${this.module_name}] Started transaction: ${transaction_id}`);

            return transaction_id;
        }
        catch (error: unknown) { this.handleError("beginTransaction", error); }
    }

    // Method to commit a transaction
    public commitTransaction = async (transaction_id: string): Promise<boolean> => {
        try {
            const conn = this.pools.get(transaction_id) as PoolClient;

            if (!conn) {
                this.logger.error(`[${this.module_name}] Invalid transaction ID: ${transaction_id}`);
                return false;
            }

            await conn.query("COMMIT");
            conn.release();

            this.pools.delete(transaction_id);
            this.logger.success(`[${this.module_name}] Committed transaction: ${transaction_id}`);

            return true;
        }
        catch (error: unknown) { this.handleError("commitTransaction", error); }
    }

    // Method to Rollback transaction by ID
    public rollbackTransaction = async (transaction_id: string): Promise<boolean> => {
        try {
            const conn = this.pools.get(transaction_id) as PoolClient;

            if (!conn) {
                this.logger.error(`[${this.module_name}] Invalid transaction ID: ${transaction_id}`);
                return false;
            }

            await conn.query("ROLLBACK");
            conn.release();

            this.pools.delete(transaction_id);
            this.logger.success(`[${this.module_name}] Rolled back transaction: ${transaction_id}`);

            return true;
        }
        catch (error: unknown) { this.handleError("rollbackTransaction", error); }
    }

    // Method Execute a query with optional connection ID
    public executeQuery = async (query: string, params: QueryParams = {} ): Promise<ExecuteQueryResult> => {
        try {
            const { transaction_id = "" } = params;

            const connection_id = transaction_id && transaction_id != "" ? transaction_id : "default";

            const conn = this.pools.get(connection_id);

            if (!conn) { throw new Error(`No pool/connection found for id "${transaction_id}"`); }

            const log_module_name = InputTransformerUtil.toSnakeCase(this.model_name || this.module_name);
            this.logger.info(`[${log_module_name}] [${connection_id}] Executing Query:`, { query });
            
            const result        = await conn.query(query);
            const rows          = result?.rows || [];
            const command       = result?.command || "";
            const affected_rows = result?.rowCount ?? 0;
            const insert_id     = rows.length && rows[0].id ? Number(rows[0].id): 0;
            const changed_rows  = command === "UPDATE" ? affected_rows : 0

            return { success: true, rows, affected_rows, insert_id, changed_rows };
        } 
        catch (error: unknown) { this.handleError("rollbackTransaction", error); }
    }

}

export default PostgresConnector;