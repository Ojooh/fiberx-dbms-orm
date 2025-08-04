
import { 
    CreateDatabaseParams,
    CreateDatabaseUserParams,
    DialectOptions,
    GrantDatabaseUserPriviledgeParams,
} from "../../types/query_builder_type";

import { 
    SchemaDefinition,
    QueryBuilderObject,
    DataQueryBuilderObject,
    ChangeDataQueryBuilderObject,
    ColumnInputParams,
    ColumnIndexInputParams
} from "../../types/model_type";

import BaseSQLQueryBuilder from "../base_sql_query_builder";
import QueryFormatterUtil from "../../utils/query_formatter_util";
import LoggerUtil from "../../utils/logger_util";
import BaseDataTypeMapper from "../../data_type/base_data_type_mapper";
import DataTypeMapper from "../../data_type/data_type_mapper";




class MySQLQueryBuilder implements BaseSQLQueryBuilder {
    private readonly module_name: string;
    private logger: LoggerUtil;
    public readonly quote_char: string;
    public readonly like_op: string;
    public readonly json_fn: string;
    public readonly json_agg_fn: string;
    public readonly dialect_options: DialectOptions;
    public data_type_mapper: BaseDataTypeMapper;

    constructor(logger?: LoggerUtil) {
        this.module_name            = "mysql_query_builder";
        this.quote_char             = "`";
        this.like_op                = "LIKE";
        this.json_fn                = "JSON_OBJECT";
        this.json_agg_fn            = "JSON_ARRAYAGG";

        this.logger                 = new LoggerUtil(this.module_name, true);
        this.data_type_mapper       = DataTypeMapper.getDialectDataMapper("mysql", this.logger);

        this.dialect_options        = { 
            quote_char: this.quote_char, json_fn: this.json_fn, json_agg_fn: this.json_agg_fn, 
            data_type_mapper: this.data_type_mapper
        };
    }

    // Method to handle errors
    private handleError (method: string, error: unknown): never {
        const error_obj = error instanceof Error ? error : new Error("Unknown error");
        this.logger.error(`[${this.module_name}] Error in ${method}: ${error_obj.message}`, { error: error_obj });
        throw error_obj;
    }

    // Method to generate create database query
    public generateCreateDatabaseQuery = (input_params: CreateDatabaseParams): string => {
        try {
            const { database_name, collation = null, charset = null } = input_params;

            const sanitized_database_name = QueryFormatterUtil.sanitizeInput(database_name, "database_name");

            const query_clauses: string[] = [`CREATE DATABASE IF NOT EXISTS \`${sanitized_database_name}\``];

            if (collation) {
                const sanitized_collation = QueryFormatterUtil.sanitizeInput(collation, "collation");
                query_clauses.push(`COLLATE ${sanitized_collation}`);
            }

            if (charset) {
                const sanitized_charset = QueryFormatterUtil.sanitizeInput(charset, "charset");
               query_clauses.push(`CHARACTER SET ${sanitized_charset}`);
            }

            const query = query_clauses.join(" ");

            this.logger.success(`[${this.module_name}] Query generated`, { query });

            return query
        }
        catch (error: unknown) { this.handleError("generateCreateDatabaseQuery", error); }
    }

    // Method to generate DROP DATABASE query
    public generateDropDatabaseQuery = (input_params: CreateDatabaseParams): string => {
        try {
            const { database_name } = input_params;

            const sanitized_database_name = QueryFormatterUtil.sanitizeInput(database_name, "database_name");

            const query = `DROP DATABASE IF EXISTS \`${sanitized_database_name}\`;`;

            this.logger.success(`[${this.module_name}] DROP DATABASE query generated`, { query });

            return query;
        } 
        catch (error: unknown) { this.handleError("generateDropDatabaseQuery", error); }
    }

    // Method to generate create database user query
    public generateCreateDatabaseUserQuery = (input_params: CreateDatabaseUserParams): string => {
        try {
            const { username, password, host = "localhost" } = input_params;

            const sanitized_username        = QueryFormatterUtil.sanitizeInput(username, "username");
            const sanitized_password        = QueryFormatterUtil.sanitizePassword(password, "password");
            const sanitized_host            = QueryFormatterUtil.sanitizeInput(host, "host");
            const query                     = `CREATE USER IF NOT EXISTS \`${sanitized_username}\`@\`${sanitized_host}\` IDENTIFIED BY '${sanitized_password}';`;

            this.logger.success(`[${this.module_name}] Query generated`, { query });

            return query
        }
        catch (error: unknown) { this.handleError("generateCreateDatabaseUserQuery", error); }
    }

    // Method to generate  drop database user query
    public generateDropDatabaseUserQuery = (input_params: CreateDatabaseUserParams): string => {
        try {
            const { username, host = "localhost" } = input_params;

            const sanitized_username    = QueryFormatterUtil.sanitizeInput(username, "username");
            const sanitized_host        = QueryFormatterUtil.sanitizeInput(host, "host");
            const query                 = `DROP USER IF EXISTS \`${sanitized_username}\`@\`${sanitized_host}\`;`;

            this.logger.success(`[${this.module_name}] DROP USER query generated`, { query });

            return query;
        } 
        catch (error: unknown) { this.handleError("generateDropDatabaseUserQuery", error); }
    }

    // Method to generate grant database user priviledges
    public generateGrantDatabaseUserPriviledgesQuery = (input_params: GrantDatabaseUserPriviledgeParams): string => {
        try {
            const { username, database_name, table_name = "*", permissions, host = "localhost" } = input_params;

            const sanitized_username      = QueryFormatterUtil.sanitizeInput(username, "username");
            const sanitized_host          = QueryFormatterUtil.sanitizeInput(host, "host");
            const sanitized_db            = QueryFormatterUtil.sanitizeInput(database_name, "database_name");
            const sanitized_table         = QueryFormatterUtil.sanitizeInput(table_name, "table_name");
            const sanitized_permissions   = QueryFormatterUtil.sanitizePermissions(permissions, "permissions");
            const privileges_clause       = sanitized_permissions.join(", ");
            const resource_clause         = `\`${sanitized_db}\`.\`${sanitized_table}\``;
            const user_spec_clause        = `\`${sanitized_username}\`@\`${sanitized_host}\``;

            const query = `GRANT ${privileges_clause} ON ${resource_clause} TO ${user_spec_clause};`;

            this.logger.success(`[${this.module_name}] GRANT query generated`, { query });

            return query;
        } 
        catch (error: unknown) { this.handleError("generateGrantDatabaseUserPriviledgesQuery", error); }
    }

    // Method to generate revoke database user priviledges
    public generateRevokeDatabaseUserPriviledgesQuery = (input_params: GrantDatabaseUserPriviledgeParams): string => {
        try {
            const { username, database_name, table_name = "*", permissions, host = "localhost" } = input_params;

            const sanitized_username      = QueryFormatterUtil.sanitizeInput(username, "username");
            const sanitized_host          = QueryFormatterUtil.sanitizeInput(host, "host");
            const sanitized_db            = QueryFormatterUtil.sanitizeInput(database_name, "database_name");
            const sanitized_table         = QueryFormatterUtil.sanitizeInput(table_name, "table_name");
            const sanitized_permissions   = QueryFormatterUtil.sanitizePermissions(permissions, "permissions");

            const privileges_clause       = sanitized_permissions.join(", ");
            const resource_clause         = `\`${sanitized_db}\`.\`${sanitized_table}\``;
            const user_spec_clause        = `\`${sanitized_username}\`@\`${sanitized_host}\``;

            const query = `REVOKE ${privileges_clause} ON ${resource_clause} FROM ${user_spec_clause};`;

            this.logger.success(`[${this.module_name}] REVOKE query generated`, { query });

            return query.trim();
        } 
        catch (error: unknown) { this.handleError("generateRevokeDatabaseUserPriviledgesQuery", error); }
    }

    // Method to generate select query
    public generateSelectQuery = (input_params: QueryBuilderObject , schema: SchemaDefinition): string => {
        try {
            const { table_name = "" } = schema;
            const {  
                fields, where, includes, order_by, order_direction, 
                limit, offset, distinct, lock,
            } = input_params;

            const sanitized_table_name              = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const distinct_list                     = distinct ? ["DISTINCT"] : [""];
            const select_fields_list                = QueryFormatterUtil.generateFieldsCluase(fields, table_name, this.quote_char);
            const where_condition_list              = where ? QueryFormatterUtil.generateWhereClause(where, table_name, this.quote_char, this.like_op) : [""];
            const extra_condition_list              = QueryFormatterUtil.generateOptionsClause({ order_by, order_direction, limit, offset, lock }, table_name, this.quote_char);
            const { fields_clause, join_clause }    = QueryFormatterUtil.generateIncludesClause(includes, table_name, this.dialect_options);

            const all_fields_clause                 = [...distinct_list, ...select_fields_list, ...fields_clause].filter(Boolean).join(", ");
            const joins_clause                      = join_clause.filter(Boolean).join(" ");
            const where_clause                      = where_condition_list.filter(Boolean).join(" ");
            const options_clause                    = extra_condition_list.filter(Boolean).join(" ");

            const query = `SELECT ${all_fields_clause} FROM ${sanitized_table_name} ${joins_clause} ${where_clause} ${options_clause};`;

            this.logger.success(`[${this.module_name}] SELECT query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateSelectQuery", error); }
    }

    // Method to generate a select count query
    public generateSelectCountQuery = (input_params: QueryBuilderObject , schema: SchemaDefinition): string => {
        try {
            const { table_name = "" } = schema;
            const {  
                where, includes, order_by, order_direction, 
                limit, offset, distinct, lock,
            } = input_params;

            const sanitized_table_name              = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const distinct_list                     = distinct ? ["DISTINCT"] : [""];
            const where_condition_list              = where ? QueryFormatterUtil.generateWhereClause(where, table_name, this.quote_char, this.like_op) : [""];
            const extra_condition_list              = QueryFormatterUtil.generateOptionsClause({ order_by, order_direction, limit, offset, lock }, table_name, this.quote_char);
            const { fields_clause, join_clause }    = QueryFormatterUtil.generateIncludesClause(includes, table_name, this.dialect_options);

            const all_fields_clause                 = [...distinct_list,  ...["COUNT(*) as count"]].filter(Boolean).join(", ");
            const joins_clause                      = join_clause.filter(Boolean).join(" ");
            const where_clause                      = where_condition_list.filter(Boolean).join(" ");
            const options_clause                    = extra_condition_list.filter(Boolean).join(" ");

            const query = `SELECT ${all_fields_clause} FROM ${sanitized_table_name} ${joins_clause} ${where_clause} ${options_clause};`;

            this.logger.success(`[${this.module_name}] SELECT COUNT query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateSelectCountQuery", error); }
    }

    // Method to generate insert query
    public generateInsertQuery = (input_params: DataQueryBuilderObject , schema: SchemaDefinition): string => {
        try {
            const { table_name = "" } = schema;
            const {  record_data = [], ignore_duplicates = false } = input_params;

            if (!record_data.length) { this.handleError("generateInsertQuery", "record_data must contain at least one record"); }

            const sanitized_table_name              = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const { fields_clause, values_clause }  = QueryFormatterUtil.generateInsertFieldsAndValues(record_data, this.dialect_options);

            const ignore_clause                     = ignore_duplicates ? "IGNORE" : "";
            const column_names_clause               = `(${fields_clause.join(", ")})`;
            const column_values_clause              = values_clause.join(", ");

            const query = `INSERT ${ignore_clause} INTO ${sanitized_table_name} ${column_names_clause} VALUES ${column_values_clause};`;

            this.logger.success(`[${this.module_name}] INSERT query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateInsertQuery", error); }
    }

    // Method to generate update query
    public generateUpdateQuery = (input_params: ChangeDataQueryBuilderObject , schema: SchemaDefinition): string => {
        try {
            const { table_name = "" } = schema;
            const {  record_data = [],  where } = input_params;

            if (!record_data.length) { this.handleError("generateUpdateQuery", "record_data must contain at least one record"); }

            const sanitized_table_name              = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const where_condition_list              = QueryFormatterUtil.generateWhereClause(where, table_name, this.quote_char, this.like_op);
            const set_condition_list                = QueryFormatterUtil.generateUpdateFieldsWithValues(record_data[0], table_name, this.dialect_options);

            const where_clause                      = where_condition_list.filter(Boolean).join(" ");
            const set_clause                        = set_condition_list.filter(Boolean).join(', ');

            const query = `UPDATE ${sanitized_table_name} SET ${set_clause} ${where_clause};`;

            this.logger.success(`[${this.module_name}] UPDATE query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateUpdateQuery", error); }
    }

    // Method to generate delete query
    public generateDeleteQuery = (input_params: ChangeDataQueryBuilderObject , schema: SchemaDefinition): string => {
        try {
            const { table_name = "" } = schema;
            const { where } = input_params;

            const sanitized_table_name              = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const where_condition_list              = QueryFormatterUtil.generateWhereClause(where, table_name, this.quote_char, this.like_op);

            const where_clause                      = where_condition_list.filter(Boolean).join(" ");

            const query = `DELETE FROM ${sanitized_table_name} ${where_clause};`;

            this.logger.success(`[${this.module_name}] DELETE query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateDeleteQuery", error); }
    }

    // Method to generate CREATE TABLE query
    public generateCreateTableQuery = (schema: SchemaDefinition): string => {
        try {
            const { table_name = "", columns = {}, primary_key = "" } = schema;

            const sanitized_table_name              = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const columns_condition_list            = QueryFormatterUtil.generateColumnsDefinitionClause(columns, primary_key, table_name, this.dialect_options);
            const column_sql_clause                 = columns_condition_list.join(", ")

            const query = `CREATE TABLE ${sanitized_table_name} (${column_sql_clause});`;

            this.logger.success(`[${this.module_name}] CREATE TABLE query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateDeleteQuery", error); }
    }

    // Method to generate DROP TABLE query
    public generateDropTableQuery = (schema: SchemaDefinition): string => {
        try {
            const { table_name = "", columns = {}, primary_key = "" } = schema;

            const sanitized_table_name              = QueryFormatterUtil.escapeField(table_name, this.quote_char);

            const query = `DROP TABLE IF EXISTS ${sanitized_table_name};`;

            this.logger.success(`[${this.module_name}] DROP TABLE query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateDropTableQuery", error); }
    }

    // Method to generate ALTER TABLE COLUMN query
    public generateAddNewTableColumnQuery = (input_params: ColumnInputParams, schema: SchemaDefinition): string => {
        try {
            const { table_name = "", columns = {}, primary_key = "" } = schema;
            const { column_name }       = input_params;
            const column_definition     = columns[column_name];
            const valid_columns         = Object.keys(columns);
            const column_index          = valid_columns.findIndex((valid_column_name) => { return valid_column_name === column_name } );

            if(!valid_columns.includes(column_name) || column_index < 0) { 
                this.handleError("generateAddNewTablecolumnQuery", `Column name ${column_name} is not valid does not belong to Schema`); 
            }

            // Determine column position
            const after_column_name              = column_index > 0 ? valid_columns[column_index - 1] : null;
            const before_column_name             = column_index < valid_columns.length - 1 ? valid_columns[column_index + 1] : null;

            let pos_clause = "";
            if (after_column_name) { pos_clause = `AFTER ${QueryFormatterUtil.escapeField(after_column_name, this.quote_char)}`; }

            else if (before_column_name) { pos_clause = `BEFORE ${QueryFormatterUtil.escapeField(before_column_name, this.quote_char)}`; }

            const sanitized_table_name              = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const col_definition_sql                = QueryFormatterUtil.generateColumnDefinition(column_name, column_definition, table_name, this.dialect_options);
            const column_sql_clause                 = col_definition_sql.join(" ");

            const query = `ALTER TABLE ${sanitized_table_name} ADD COLUMN ${column_sql_clause} ${pos_clause};`;

            this.logger.success(`[${this.module_name}] ALTER TABLE query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateAddNewTablecolumnQuery", error); }
    }

    // Method to generate DROP TABLE COLUMN query
    public generateDropTableColumnQuery = (input_params: ColumnInputParams, schema: SchemaDefinition): string => {
        try {
            const { table_name = "", columns = {} } = schema;
            const { column_name }           = input_params;
            const sanitized_column_name     = QueryFormatterUtil.escapeField(column_name, this.quote_char);
            const sanitized_table_name      = QueryFormatterUtil.escapeField(table_name, this.quote_char);

            const query = `ALTER TABLE ${sanitized_table_name} DROP COLUMN ${sanitized_column_name};`;

            this.logger.success(`[${this.module_name}] DROP TABLE COLUMN  query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateDropTablecolumnQuery", error); }
    }

    // Method to generate CREATE COLUMN INDEX query
    public generateAddIndexQuery = (input_params: ColumnIndexInputParams, schema: SchemaDefinition): string => {
        try {
            const { table_name = "", columns = {} } = schema;
            const { fields, unique }        = input_params;
            const valid_columns         = Object.keys(columns);

            if(!fields || !Array.isArray(fields) || !fields.length) {
                this.handleError("generateAddIndexQuery", `Index fields params must be an array of column names`);
            }

            const has_invalid_element = fields.some(el => !valid_columns.includes(el));

            if (has_invalid_element) {
                this.handleError("generateAddIndexQuery", `Index fields contain one or more invalid columns in table ${table_name}`);
            }

            const sanitized_table_name      = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const sanitized_field_names     = fields.map((field) => { return QueryFormatterUtil.escapeField(field, this.quote_char); });
            const sanitized_index_name      = QueryFormatterUtil.escapeField(`idx_${table_name}_${fields.join('_')}`, this.quote_char);
            const index_field_clause        = sanitized_field_names.join(", ");
            const unique_clause             = unique ? "UNIQUE" : "";

            const query = `CREATE ${unique_clause} INDEX ${sanitized_index_name} ON ${sanitized_table_name} (${index_field_clause});`;

            this.logger.success(`[${this.module_name}] CREATE COLUMN INDEX query generated`, { query });
            return query.trim();
        }
        catch (error: unknown) { this.handleError("generateAddIndexQuery", error); }
    }

    // Method to generate DROP INDEX query
    public generateRemoveIndexQuery = (index_name: string, schema: SchemaDefinition): string => {
        try {
            const { table_name = "" } = schema;

            if (!index_name || typeof index_name !== "string") {
                this.handleError("generateRemoveIndexQuery", `Index name must be a non-empty string`);
            }

            const sanitized_table_name = QueryFormatterUtil.escapeField(table_name, this.quote_char);
            const sanitized_index_name = QueryFormatterUtil.escapeField(index_name, this.quote_char);

            const query = `DROP INDEX ${sanitized_index_name} ON ${sanitized_table_name};`;

            this.logger.success(`[${this.module_name}] DROP INDEX query generated`, { query });
            return query.trim();
        } catch (error: unknown) {
            this.handleError("generateRemoveIndexQuery", error);
        }
    }




}

export default MySQLQueryBuilder;