const { randomUUID }    = require('crypto');
const { Pool }          = require('pg');


const LoggerUtil            = require("../../utils/logger_util");
const PostgresDbUserManager = require("../user_access_control/postgres_db_user_manager");

class PostgresDatasourceConnector {
    constructor(options, logger = null) {
        this.name               = "postgres_datasource_connector";
        this.options            = options;
        this.connector_pool     = null;

        this.logger             = logger || new LoggerUtil(this.name);
        this.db_user_manager    = new PostgresDbUserManager(this, this.options, this.logger);
    }

    // Method to find or create database
    findOrCreateDb = async (config) => {
        try {
            const { host, port, user, password, database, collation, charset } = this.options;
            const connection = await createConnection({ host, port, user, password, database: "postgres" });

            const result = await connection.query( "SELECT 1 FROM pg_database WHERE datname = $1",[database]);

            if (result?.rowCount === 0) {
                this.logger.info(`[${this.name}] Database '${database}' does not exist. Creating...`);
                const query = this.#generateCreateDatabaseQuery(database, collation, charset);
                await connection.query(query);
                this.logger.info(`[${this.name}]  Database '${database}' created successfully.`);
                return true
            } 
            
            this.logger.info(`[${this.name}] Database '${database}' already exists.`);
            return true
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] Failed to findOrCreateDb`, { config, error });
            throw error;
        }
    }

    // 👉 Establish connection to PostgreSQL
    connect = async () => {
        try {
            const {
                host, port, user, password, database,
                pool_max: max = 10, idle_timeout: idleTimeoutMillis = 30000
            } = this.options;

            const pool_config_obj = {
                host, port, user, password, database, max, idleTimeoutMillis,
                connectionTimeoutMillis: 5000,
            };

            await this.findOrCreateDb(pool_config_obj);

            this.connector_pool                 = new Pool(pool_config_obj);
            this.db_user_manager.connector     = this;

            this.logger.info(`🐘 [${this.name}] Connected to PostgreSQL successfully`);
            return this.connector_pool;
        } catch (error) {
            this.logger.error(`❌ [${this.name}] Connection failed`, { options: this.options, error });
            throw error;
        }
    };

    // 🔌 Disconnect from PostgreSQL
    disconnect = async () => {
        try {
            if (!this.connector_pool) {
                this.logger.warn(`⚠️ [${this.name}] No active pool to disconnect`);
                return false;
            }

            await this.connector_pool.end();
            this.connector_pool = null;
            this.logger.info(`🔌 [${this.name}] Connection pool closed`);
        } catch (error) {
            this.logger.error(`❌ [${this.name}] Disconnection failed`, { error });
            throw error;
        }
    };

    // 🧠 Connect if not already connected
    connectIfNeeded = async () => {
        return this.connector_pool ?? await this.connect();
    };

    // 🔄 Begin a transaction
    beginTransaction = async () => {
        try {
            await this.connectIfNeeded();
            const client = await this.connector_pool.connect();
            await client.query('BEGIN');
            client.transaction_id = randomUUID();

            this.logger.info(`🚀 [${this.name}][${client.transaction_id}] BEGIN TRANSACTION`);
            return client;
        } catch (error) {
            this.logger.error(`❌ [${this.name}] beginTransaction failed`, { error });
            throw error;
        }
    };

    // ✅ Commit transaction
    commitTransaction = async (client) => {
        try {
            if (!client) {
                const msg = `[${this.name}] Cannot commit: No active client`;
                this.logger.error(msg);
                throw new Error(msg);
            }

            await client.query('COMMIT');
            client.release();
            this.logger.info(`✅ [${this.name}][${client.transaction_id}] COMMIT TRANSACTION`);
        } catch (error) {
            this.logger.error(`❌ [${this.name}] commitTransaction failed`, { error });
            throw error;
        }
    };

    // ❌ Rollback transaction
    rollbackTransaction = async (client) => {
        try {
            if (!client) {
                const msg = `[${this.name}] Cannot rollback: No active client`;
                this.logger.error(msg);
                throw new Error(msg);
            }

            await client.query('ROLLBACK');
            client.release();
            this.logger.info(`↩️ [${this.name}][${client.transaction_id}] ROLLBACK TRANSACTION`);
        } catch (error) {
            this.logger.error(`❌ [${this.name}] rollbackTransaction failed`, { error });
            throw error;
        }
    };

    // 🛠 Execute a SQL query
    executeQuery = async (query, options = {}) => {
        try {
            await this.connectIfNeeded();

            const { transaction, params = [] }  = options;
            const query_log_type                = transaction?.transaction_id || "Default";
            
            this.logger.info(`🧠 [${this.name}] [${query_log_type}] Executing: ${query} | Params: ${JSON.stringify(params)}`);

            const client = transaction || this.connector_pool;
            const result = await client.query(query, params);
            return result.rows;
        } catch (error) {
            this.logger.error(`❌ [${this.name}] executeQuery failed`, { query, options, error });
            throw error;
        }
    };

    // Method to generate create database query
    #generateCreateDatabaseQuery = (database, collation = "", charset = "") => {
        if (!/^[a-zA-Z0-9_]+$/.test(database)) {
            throw new Error("Invalid database name");
        }
        
        let query = `CREATE DATABASE \`${database}\``;

        if (charset) { query += ` ENCODING '${encoding}`; }

        if (collation) { query += ` LC_COLLATE='${lc_collate}`; }


        return query;
    }
}

module.exports = PostgresDatasourceConnector;
