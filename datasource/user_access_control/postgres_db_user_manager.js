const LoggerUtil = require("../../utils/logger_util");

class PostgresDbUserManager {
    constructor(connector, options, logger = null) {
        this.name               = "postgres_db_user_manager";
        this.connector          = connector;
        this.options            = options;
        this.logger             = logger || new LoggerUtil(this.name);

        this.permission_map = { read: "SELECT", create: "INSERT", update: "UPDATE", delete: "DELETE" };
    }

    // Method to create database query
    generateCreateDatabaseQuery = (database) => {
        this.#sanitizeInputs(database, "database");
        return `CREATE DATABASE "${database}"`;
    }

    // Method to create user
    createUser = async (username, password) => {
        this.#sanitizeInputs(username, "username");

        if (typeof password !== 'string' || password.length < 6) {
            throw new Error(`[${this.name}] Password must be at least 6 characters`);
        }

        try {
            // Check if user exists
            const check_query   = `SELECT 1 FROM pg_roles WHERE rolname = $1`;
            const result        = await this.connector.executeQuery(check_query, { params: [username] });

            if(result.rows.length) {
                this.logger.info(`[${this.name}] ✅ User '${username}' already exists`);
                return true;
            }

            const query = `CREATE USER "${username}" WITH PASSWORD $1`;
            await this.connector.executeQuery(query, { params: [password] });

            this.logger.info(`[${this.name}] ✅ Created PostgreSQL user '${username}' successfully`);
            return true;
        }
        catch (error) {
            const params = { username, error };
            this.logger.error(`❌ [${this.name}] Error in createUser method`, params);
            throw error;
        }
    }

    // Method to create database
    createDatabase = async (database, collation, charset) => {
        this.#sanitizeInputs(database, "database");

        try {
            const check_query   = "SELECT 1 FROM pg_database WHERE datname = $1";
            const result        = await this.connector.executeQuery(check_query, { params: [database] });

            if(result?.rowCount) {
                this.logger.info(`[${this.name}] ✅ Database '${database}' already exists`);
                return true;
            }

            const query = this.generateCreateDatabaseQuery(database);
            await this.connector.executeQuery(query);

            this.logger.info(`[${this.name}] ✅ Created PostgreSQL database '${database}' successfully`);
            return true;
        }
        catch (error) {
            const params = { database, error };
            this.logger.error(`❌ [${this.name}] Error in createDatabase method`, params);
            throw error;
        }
    }

    // Method to grant user privileges
    grantPrivileges = async (username, database, table = "*", permissions = []) => {
        this.#sanitizeInputs(username, "username");
        this.#sanitizeInputs(database, "database");
        this.#sanitizeInputs(table, "table");

        try {
            const valid_permissions = permissions.filter(p => this.permission_map[p]);

            if (!valid_permissions.length) {
                const msg = `[${this.name}] Invalid or missing permissions`;
                this.logger.error(msg);
                throw new Error(msg);
            }

            const mapped_privileges = valid_permissions.map(p => this.permission_map[p]);
            const privilege_str     = mapped_privileges.join(', ');

            const query = `GRANT ${privilege_str} ON TABLE "${database}".public."${table}" TO "${username}"`;

            await this.connector.executeQuery(query);

            this.logger.info(`[${this.name}] ✅ Granted ${privilege_str} on ${database}.${table} to '${username}'`);
            return true;
        }
        catch (error) {
            const params = { username, database, table, permissions, error };
            this.logger.error(`❌ [${this.name}] Error in grantPrivileges method`, params);
            throw error;
        }
    }

    createDatabaseAndUser = async (params) => {
        const { database, username, password, table = "*", permissions = [] } = params;

        await this.createUser(username, password);
        await this.createDatabase(database);
        await this.grantPrivileges(username, database, table, permissions);

        return true;
    }

    #sanitizeInputs = (input, input_name) => {
        if (!/^[a-zA-Z0-9_]+$/i.test(input)) {
            const msg = `[${this.name}] Error invalid input "${input_name}"`;
            this.logger.error(msg);
            throw new Error(msg);
        }
    }
}

module.exports = PostgresDbUserManager;


