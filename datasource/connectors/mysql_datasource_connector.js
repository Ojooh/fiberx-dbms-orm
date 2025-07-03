const { randomUUID }    = require('crypto');
const { createPool, createConnection }    = require("mysql2/promise");


const LoggerUtil            = require("../../utils/logger_util");
const MysqlDbUserManager    = require("../user_access_control/mysql_db_user_manager");

class MysqlDatasourceConnector {
    constructor(options, logger = null) {
        this.name               = "mysql_datasource_connector";
        this.options            = options;
        this.connector_pool     = null;

        this.logger             = logger || new LoggerUtil(this.name);
        this.db_user_manager    = new MysqlDbUserManager(this.connector_pool, this.options, this.logger);
    }

    // Method to find or create database
    findOrCreateDb = async (config) => {
        try {
            const { host, port, user, password, database, collation, charset } = this.options;
            const connection = await createConnection({ host, port, user, password});

            const [rows] = await connection.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [database]);

            if (rows.length === 0) {
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

    // 👉 Establish connection to MySQL
    connect = async () => {
        try {
            const { 
                host, port, user, password, database, 
                pool_max: connectionLimit = 10, idle_timeout: idleTimeout = 50000
            } = this.options;

            const pool_config_obj = {
                host, port, user, password, database, connectionLimit, idleTimeout,
                waitForConnections: true, maxIdle: 5, queueLimit: 0
            };

            await this.findOrCreateDb(pool_config_obj);

            this.connector_pool                     = createPool(pool_config_obj);
            this.db_user_manager.connector          = this.connector_pool;

            this.logger.info(`✅ [${this.name}] Connection to MySQL established successfully`);
            return this.connector_pool;
        } catch (error) {
            this.logger.error(`❌ [${this.name}] Failed to connect to MySQL`, { options: this.options, error });
            throw error;
        }
    };

    // ✅ Disconnect cleanly
    disconnect = async () => {
        try {
            if (!this.connector_pool) {
                this.logger.error(`⚠️ [${this.name}] No active connection to disconnect`);
                return false;
            }

            await this.connector_pool.end();
            this.connector_pool = null;
            this.logger.info(`🔌 [${this.name}] Connection to MySQL closed`);
        } catch (error) {
            this.logger.error(`❌ [${this.name}] Failed to disconnect`, { error });
            throw error;
        }
    };

    // 🧠 Ensure connection is available
    connectIfNeeded = async () => {
        return this.connector_pool ?? await this.connect();
    };

    // 🔄 Begin a transaction
    beginTransaction = async () => {
        try {
            await this.connectIfNeeded();

            const connection = await this.connector_pool.getConnection();
            await connection.beginTransaction();
            connection.transaction_id = randomUUID();

            this.logger.info(`🚀 [${this.name}][${connection.transaction_id}] BEGIN TRANSACTION`);
            return connection;
        } catch (error) {
            this.logger.error(`❌ [${this.name}] Error starting transaction`, { error });
            throw error;
        }
    };

    // ✅ Commit a transaction
    commitTransaction = async (connection) => {
        try {
            let error_msg = "";

            if (!connection) {
                error_msg = `[${this.name}] Cannot commit: No active connection`
                this.logger.error(error_msg)
                throw new Error(error_msg);
            }

            await connection.commit();
            connection.release();
            this.logger.info(`✅ [${this.name}][${connection.transaction_id}] COMMIT TRANSACTION`);
        } 
        catch (error) {
            this.logger.error(`❌ [${this.name}] Commit failed`, { error });
            throw error;
        }
    };

    // ❌ Rollback a transaction
    rollbackTransaction = async (connection) => {
        try {
            let error_msg = "";

            if (!connection) {
                error_msg = `[${this.name}] Cannot rollback: No active connection`
                this.logger.error(error_msg)
                throw new Error(error_msg);
            }

            await connection.rollback();
            connection.release();
            this.logger.info(`↩️ [${this.name}][${connection.transaction_id}] ROLLBACK TRANSACTION`);
        } catch (error) {
            this.logger.error(`❌ [${this.name}] Rollback failed`, { error });
            throw error;
        }
    };

    // Method to execute MYSQL QUERY
    executeQuery = async (query, options = {}) => {
        try {
             await this.connectIfNeeded();

            const { transaction, params = [],  }  = options;
            const query_log_type                    = transaction ? (transaction?.transaction_id) : "Default"

            this.logger.info(`🧠 [${this.name}] [${query_log_type}] Executing: ${query} | Params: ${JSON.stringify(params)}`);

            const connection    = transaction || this.connector_pool;
            const [rows]        = await connection.execute(query, params);
            return rows;

        } 
        catch (error) {
            const params = { query, options, error };
            this.logger.error(`❌ [${this.name}] Error in ${this.name} - executeQuery method`, params);
            throw error;
        }
    }

    // Method to generate create database query
    #generateCreateDatabaseQuery = (database, collation = "", charset = "") => {
        if (!/^[a-zA-Z0-9_]+$/.test(database)) {
            throw new Error("Invalid database name");
        }
        
        let query = `CREATE DATABASE \`${database}\``;
        if (collation) { query += ` COLLATE ${collation}`; }
        if (charset) { query += ` CHARACTER SET ${charset}`; }
        return query;

    }

}

module.exports = MysqlDatasourceConnector;
