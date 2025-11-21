
import { 
    CreateDatabaseParams,
    CreateDatabaseUserParams,
    GrantDatabaseUserPriviledgeParams,
    SQLDialect
} from "../../../types/query_builder_type";

import BaseSQLAdmin from "../base_sql_admin";
import BaseSQLConnector from "../../connectors/base_sql_connector";
import LoggerUtil from "../../../utils/logger_util";
import SQLQueryBuilder from "../../../query_builders/base_sql_query_builder";
import { SchemaDefinitionInterface } from "../../../types/model_type";

class SQLAdmin implements BaseSQLAdmin {
    private readonly module_name: string;
    private logger: LoggerUtil;
    private query_builder: SQLQueryBuilder;
    private connection_manager: BaseSQLConnector;

    constructor(connection_manager: BaseSQLConnector, logger?: LoggerUtil) {
        this.module_name            = "sql_admin";
        this.logger                 = logger ?? new LoggerUtil(this.module_name, true);
        this.connection_manager     = connection_manager;
        this.query_builder          = connection_manager?.query_builder;
    }

    private handleError(method: string, error: unknown): false {
        const error_obj = error instanceof Error ? error : new Error("Unknown error");
        this.logger.error(`[${this.module_name}] Error in ${method}: ${error_obj.message}`, { error_obj });
        return false;
    }

    // Method to create a new database
    public createNewDatabase = async (input_params: CreateDatabaseParams): Promise<boolean> => {
        try {
            const sql_query = this.query_builder.generateCreateDatabaseQuery(input_params);

            const { success: executed } = await this.connection_manager.executeQuery(sql_query);

            return executed ? true : false;
        }
        catch (error: unknown) { return this.handleError( "createNewDatabase", error); }
    }

    // Method to delete a database
    public deleteDatabase = async (input_params: CreateDatabaseParams): Promise<boolean> => {
        try {
            const sql_query = this.query_builder.generateDropDatabaseQuery(input_params);

            const { success: executed } = await this.connection_manager.executeQuery(sql_query);

            return executed ? true : false;
        }
        catch (error: unknown) { return this.handleError( "deleteDatabase", error); }
    }

    // Method to create a new user
    public createNewUser = async (input_params: CreateDatabaseUserParams): Promise<boolean> => {
        try {
            const sql_query = this.query_builder.generateCreateDatabaseUserQuery(input_params);

            const { success: executed } = await this.connection_manager.executeQuery(sql_query);

            return executed ? true : false;
        }
        catch (error: unknown) { return this.handleError( "createNewUser", error); }
    }

    // Method to delete a user
    public deleteUser = async (input_params: CreateDatabaseUserParams): Promise<boolean> => {
        try {
            const sql_query = this.query_builder.generateDropDatabaseUserQuery(input_params);

            const { success: executed } = await this.connection_manager.executeQuery(sql_query);

            return executed ? true : false;
        }
        catch (error: unknown) { return this.handleError( "deleteUser", error); }
    }

    // Method to create a new table under a databse
    public createTableInDatabase = async (schema: SchemaDefinitionInterface): Promise<boolean> => {
        try {
            const { table_name, app_id, indexes } = schema;

            const table_sql_query = this.query_builder.generateCreateTableQuery(schema);

            this.logger.info(`[${this.module_name}] Creating table '${table_name}' for app '${app_id}' with query: ${table_sql_query}`);

            const { success: executed } = await this.connection_manager.executeQuery(table_sql_query);

            if(!executed) {
                this.logger.error(`[${this.module_name}] Failed to create table '${table_name}' for app '${app_id}'`);
                return false;
            }

            this.logger.info(`[${this.module_name}] Successfully created table '${table_name}' for app '${app_id}'`);
            this.logger.info(`[${this.module_name}] Creating indexes for table '${table_name}'`);
            const drop_table_query = this.query_builder.generateDropTableQuery(schema);

            for (let index of indexes || []) {
                const index_sql_query = this.query_builder.generateAddIndexQuery(index, schema);

                this.logger.info(`[${this.module_name}] Creating index of fields '${index?.fields.join(", ")}' for table '${table_name}' with query: ${index_sql_query}`);

                const { success: index_executed } = await this.connection_manager.executeQuery(index_sql_query);

                if(!index_executed) {
                    const {success: table_dropped } = await this.connection_manager.executeQuery(drop_table_query);
                    this.logger.error(`[${this.module_name}] Failed to create index of fields '${index?.fields.join(", ")}'  for table '${table_name}', Table drooped status on cleanup: ${table_dropped}`);
                    return false;
                }

                this.logger.info(`[${this.module_name}] Successfully created index of fields '${index?.fields.join(", ")}'  for table '${table_name}'`);
            }

            return true
        }
        catch (error: unknown) { return this.handleError( "createTableInDatabase", error); }
    }

    // Method to grant user priviledges
    public grantUserPriviledges = async (input_params: GrantDatabaseUserPriviledgeParams): Promise<boolean> => {
        try {
            const sql_query = this.query_builder.generateGrantDatabaseUserPriviledgesQuery(input_params);

            const { success: executed } = await this.connection_manager.executeQuery(sql_query);

            return executed ? true : false;
        }
        catch (error: unknown) { return this.handleError( "grantUserPriviledges", error); }
    }

    // Method to create a new database
    public revokeUserPriviledges = async (input_params: GrantDatabaseUserPriviledgeParams): Promise<boolean> => {
        try {
            const sql_query = this.query_builder.generateRevokeDatabaseUserPriviledgesQuery(input_params);

            const { success: executed } = await this.connection_manager.executeQuery(sql_query);

            return executed ? true : false;
        }
        catch (error: unknown) { return this.handleError( "revokeUserPriviledges", error); }
    }

}

export default SQLAdmin;
