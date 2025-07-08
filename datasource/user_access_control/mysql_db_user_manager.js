const LoggerUtil        = require("../../utils/logger_util");

class MysqlDbUserManager {
    constructor(connector, options, logger = null) {
        this.name               = "mysql_db_user_manager";
        this.connector          = connector;  
        this.options            = options;
        this.logger             = logger || new LoggerUtil(this.name);

        this.permission_map     = { read: "SELECT", create: "INSERT", update: "UPDATE", delete: "DELETE" };
    }

    // Method to generate create database query
    generateCreateDatabaseQuery = (database, collation = "", charset = "") => {
        this.#sanitizeInputs(database, "database");

        this.#sanitizeInputs(collation, "collation");

        this.#sanitizeInputs(charset, "charset");
        
        let query = `CREATE DATABASE IF NOT EXISTS \`${database}\``;

        if (collation) { query += ` COLLATE ${collation}`; }

        if (charset) { query += ` CHARACTER SET ${charset}`; }

        return query;
    }

    // Method to create a db user 
    createUser = async (username, password) => {
        this.#sanitizeInputs(username, "username");

        if (typeof password !== 'string' || password.length < 6) {
            throw new Error(`[${this.name}] Password must be at least 6 characters`);
        }

        try {
            const { host } = this.options;

            const query = `CREATE USER IF NOT EXISTS '${username}'@'${host}' IDENTIFIED BY '${password}'`;
            await this.connector.executeQuery(query);

            this.logger.info(`[${this.name}] ✅ Created MySQL user '${username}' successfully`);
            return true
        }
        catch (error) {
            const params = { username, password, error };
            this.logger.error(`❌ [${this.name}] Error in createUser method`, params);
            throw error;
        }
    }

    // Method to create a database
    createDatabase = async (database, collation, charset) => {
        this.#sanitizeInputs(database, "database");

        this.#sanitizeInputs(collation, "collation");

        this.#sanitizeInputs(charset, "charset");

        try {
            const create_query = this.generateCreateDatabaseQuery(database, collation, charset);
            await this.connector.executeQuery(create_query);

            this.logger.info(`[${this.name}] ✅ Created MySQL Datbase '${database}' successfully`);
            return true
        }
        catch (error) {
            const params = { database, collation, charset, error };
            this.logger.error(`❌ [${this.name}] Error in createDatabase method`, params);
            throw error;
        }
    }

    // Method to revoke all priviledges if any exist
    revokeUserExistingPriviledge = async (username, database, table) => {
        this.#sanitizeInputs(username, "username");

        this.#sanitizeInputs(database, "database");

        this.#sanitizeInputs(table, "table");

        try {
            const { host }          = this.options;
            const user_identifier   = `'${username}'@'${host}'`;
            const revoke_query      = `REVOKE ALL PRIVILEGES ON \`${database}\`.\`${table}\` FROM ${user_identifier}`;


            await this.connector.executeQuery(revoke_query);
            this.logger.info(`[${this.name}] 🔄 Revoked all privileges on ${database}.${table} from '${username}'`);

            return true
        }
        catch (error) {
            const params = { username, database, table, error };
            this.logger.error(`❌ [${this.name}] Error in revokeUserExistingPriviledge method`, params);
            return false
        }
    }

    // Method to grant user privileges
    grantPrivileges = async (username, database, table = "*", permissions = []) => {
        this.#sanitizeInputs(username, "username");

        this.#sanitizeInputs(database, "database");

        this.#sanitizeInputs(table, "table");

        try {
            const { host } = this.options;

            const valid_permissions = permissions.filter(p => this.permission_map[p]);

            if (!valid_permissions.length) {
                const msg = `[${this.name}] Invalid or missing permissions`;
                this.logger.error(msg)
                throw new Error(msg);
            }

            const mapped_privileges = valid_permissions.map(p => this.permission_map[p]);

            if (!mapped_privileges.length) {
                const msg = `[${this.name}] Error in grantPrivileges No valid permissions provided.`;
                this.logger.error(msg);
                throw new Error(msg);
            }

            const privilege_str     = mapped_privileges.join(', ');
            const user_identifier   = `'${username}'@'${host}'`;

            // Step 1: Revoke all privileges on the specified database and table
            await this.revokeUserExistingPriviledge(username, database, table);

            // Step 2: Grant the new privileges
            const grant_query = `GRANT ${privilege_str} ON \`${database}\`.\`${table}\` TO ${user_identifier}`;
            await this.connector.executeQuery(grant_query);
            this.logger.info(`[${this.name}] ✅ Granted ${privilege_str} on ${database}.${table} to '${username}'`);


            return true
        }
        catch (error) {
            const params = { username, database, table, permissions, error };
            this.logger.error(`❌ [${this.name}] Error in grantPrivileges method`, params);
            throw error;
        }
        // finally { await this.flushPrivileges(); }
    }

    // Method to flush prividledges
    flushPrivileges = async () => {
        await this.connector.executeQuery(`FLUSH PRIVILEGES`);

        this.logger.info(`[${this.name}] ✅ Flushed MySQL privileges`);
        return true
    }

    createDatabaseAndUser = async ( params ) => {
        const { collation, charset, database, username, password, table = "*", permissions = [] } = params;

        // create user
        await this.createUser(username, password);

        // create db
        await this.createDatabase(database, collation, charset);
        
        // grant permission privilege
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

module.exports = MysqlDbUserManager