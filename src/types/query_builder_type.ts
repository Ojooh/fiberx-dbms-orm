import BaseDataTypeMapper from "../data_type/base_data_type_mapper";

export interface CreateDatabaseParams { database_name: string; collation?: string; charset?: string; }

export interface CreateDatabaseUserParams { host?: string; username: string; password?: string }

export interface GrantDatabaseUserPriviledgeParams {  username: string; database_name: string; table_name?: string; permissions: string[]; host?: string; }

export type SQLDialect = "mysql" | "postgres" | "sqlite";

export interface GenerateSubQueryFieldParams {
    base_table_name: string;
    target_table_name: string;
    target_fields: string[];
    foreign_key?: string;
    target_key?: string;
    target_where?: Record<string, any> | null;
    target_alias?: string;
    json_agg_fn?: string; // default = "JSON_OBJECT"
    json_fn?: string;     // default = "JSON_ARRAYAGG"
    quote_char?: string;  // default = "`"
}

export interface GenerateJoinParams {
    base_table_name: string;
    association_type: string;
    target_table_name: string;
    target_fields: string[];
    foreign_key?: string;
    target_key?: string;
    target_where?: Record<string, any> | null;
    target_alias?: string;
    target_required?: boolean; // default = false
    quote_char?: string;       // default = "`"
}



export interface DialectOptions {
    quote_char?: string;
    json_agg_fn?: string;
    json_fn?: string;
    data_type_mapper: BaseDataTypeMapper
}
