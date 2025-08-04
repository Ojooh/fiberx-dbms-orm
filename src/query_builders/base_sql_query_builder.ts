
import { 
    CreateDatabaseParams,
    CreateDatabaseUserParams,
    GrantDatabaseUserPriviledgeParams
} from "../types/query_builder_type";

import { 
    SchemaDefinition,
    QueryBuilderObject,
    DataQueryBuilderObject,
    ChangeDataQueryBuilderObject,
    ColumnInputParams,
    ColumnIndexInputParams,
} from "../types/model_type";



interface BaseSQLQueryBuilder {
    quote_char: string;

    // Generate CREATE DATABASE query
    generateCreateDatabaseQuery(input_params: CreateDatabaseParams): string;

    // Generate DROP DATABASE query
    generateDropDatabaseQuery(input_params: CreateDatabaseParams): string;

    // Generate CREATE USER query
    generateCreateDatabaseUserQuery(input_params: CreateDatabaseUserParams): string;

    // Generate DROP USER query
    generateDropDatabaseUserQuery(input_params: CreateDatabaseUserParams): string;

    // Generate GRANT PRIVILEGES query
    generateGrantDatabaseUserPriviledgesQuery(input_params: GrantDatabaseUserPriviledgeParams): string;

    // Generate REVOKE PRIVILEGES query
    generateRevokeDatabaseUserPriviledgesQuery(input_params: GrantDatabaseUserPriviledgeParams): string;

    // Generate SELECT query
    generateSelectQuery(input_params: QueryBuilderObject | {}, schema: SchemaDefinition): string;

    // Generate SELECT COUNT query
    generateSelectCountQuery(input_params: QueryBuilderObject | {}, schema: SchemaDefinition): string;

    // Generate INSERT query
    generateInsertQuery(input_params: DataQueryBuilderObject | {}, schema: SchemaDefinition): string;

    // Generate UPDATE query
    generateUpdateQuery(input_params: ChangeDataQueryBuilderObject | {}, schema: SchemaDefinition): string;

    // Generate DELETE query
    generateDeleteQuery(input_params: ChangeDataQueryBuilderObject | {}, schema: SchemaDefinition): string;

    // Generate CREATE TABLE query
    generateCreateTableQuery(schema: SchemaDefinition): string;

    // Generate DROP TABLE query
    generateDropTableQuery(schema: SchemaDefinition): string;

    // Generate ALTER TABLE COLUMN query
    generateAddNewTableColumnQuery(input_params: ColumnInputParams, schema: SchemaDefinition): string;

    // Generate DROP TABLE COLUMN query
    generateDropTableColumnQuery(input_params: ColumnInputParams, schema: SchemaDefinition): string;

    // Generate CREATE COLUMN INDEX query
    generateAddIndexQuery(input_params: ColumnIndexInputParams, schema: SchemaDefinition): string;

    // Generate DROP INDEX query
    generateRemoveIndexQuery(index_name: string, schema: SchemaDefinition): string;
}
export default BaseSQLQueryBuilder;