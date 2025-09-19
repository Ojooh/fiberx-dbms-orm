import BaseSQLModel from "../base_models/base_sql_model";

export type AssociationType = "hasMany" | "hasOne" | "belongsTo" | "belongsToMany";

export interface AssociationOptions { 
    foreign_key?: string;
    target_key?: string;
    through?: string | typeof BaseSQLModel;
    as?: string;
    [key: string]: any; 
}

export interface AssociationDefinition { 
    type: AssociationType; 
    source: typeof BaseSQLModel; 
    model: typeof BaseSQLModel; 
    foreign_key?: string;
    target_key?: string;
    through?: string | typeof BaseSQLModel;
    as?: string;
    [key: string]: any; 
}

export type ColumnName = "ABSTRACT" | "STRING" | "CHAR" | "TEXT" | "NUMBER" | "TINYINT" | "SMALLINT" | "MEDIUMINT" | 
"INTEGER" | "BIGINT" | "FLOAT" | "DOUBLE" | "DOUBLE_PRECISION" | "DECIMAL" | "NUMERIC" | "REAL" | "DATE" | "DATEONLY" | 
"TIME" | "NOW" | "BOOLEAN" | "BLOB" | "UUID" | "UUIDV1" | "UUIDV4" | "JSON" | "JSONB" | "ARRAY" | "NONE" | "ENUM" | 
"RANGE" | "GEOMETRY" | string;

export interface ColumnType {
    name: ColumnName;
    length?: number;                       // for STRING, CHAR, ABSTRACT
    variant?: "tiny" | "medium" | "long";  // for TEXT and BLOB
    precision?: number | null;            // for FLOAT, DOUBLE, DECIMAL, NUMERIC
    scale?: number | null;                // for DECIMAL, NUMERIC
    element_type?: ColumnType | null;     // for ARRAY
    values?: (string | number)[];         // for ENUM
    sub_type?: string | null;             // for RANGE
    type?: string | null;                 // for GEOMETRY
    srid?: number | null;                 // for GEOMETRY
    unsigned?: boolean
}

export type ReferentialAction = "CASCADE"| "SET NULL"| "SET DEFAULT"| "RESTRICT"| "NO ACTION" | string;


export interface ColumnDefinition {
    type: ColumnType;
    auto_increment?: boolean;
    unique?: boolean;
    primary_key?: boolean;
    nullable?: boolean;
    default?: string | number | boolean | null;
    on_update?: string;
    references?: { table:string; column: string; on_delete?: ReferentialAction, on_update?: ReferentialAction }
}

export interface IndexDefinition { fields: string[]; unique: boolean; }

export type Permission = "read" | "create" | "update" | "delete";

export interface SchemaDefinitionInterface {
    id?: number;
    name?: string;
    app_id?: string;
    table_name?: string;
    model_name?: string;
    datasource_name?: string;
    datasource_type?: "mysql" | "postgres" | string;
    primary_key?: string;
    migration_priority?: number;
    timestamps?: 0 | 1 | boolean;
    permissions?: Permission[];
    columns?: Record<string, ColumnDefinition>;
    indexes?: IndexDefinition[];
    status?: "PENDING" | "ACTIVE" | "DEPRECATED" | string;
}

export interface ColumnsAlteredInterface {
    column_name: string;
    old_def: ColumnDefinition;
    new_def: ColumnDefinition;
}

export interface SchemaSnapshotDifferenceInterface {
    columns_to_add: string[];
    columns_to_remove: string[];
    columns_to_alter: ColumnsAlteredInterface[];
    indexes_to_add: IndexDefinition[];
    indexes_to_remove: IndexDefinition[];
    create_table: boolean;
}

export interface IncludeOptions {
    limit?: number;
    offset?: number;
    order_by?: string;
    order_direction?: "ASC" | "DESC";
}

export interface IncludeMeta {
    model: typeof BaseSQLModel;
    as?: string;
    where?: Record<string, any>;
    fields?: string[];
    includes?: IncludeMeta[];
    required?: boolean;
    options?: IncludeOptions
}

export interface IncludeQuery {
    target_table_name: string;
    foreign_key?: string;
    target_key?: string;
    target_fields?: string[];
    target_alias?: string;
    target_is_required?: boolean;
    target_where?: Record<string, any> | null;
    association_type: string;
    includes?: IncludeQuery[];
}


export interface InputParamsOptions {
    limit?: number;
    offset?: number;
    order_by?: string;
    order_direction?: "ASC" | "DESC" | string;
    lock?: string;
    includes?: IncludeMeta[];
    transaction_id?: string;
    distinct?: boolean
}


export interface FindByPkInputParams {
    id: string | number;
    fields?: string[],
    options?: InputParamsOptions
}

export interface FindInputParams {
    fields?: string[],
    options?: InputParamsOptions,
    where: Record<string, any>;
}

export interface CountInputParams {
    options?: InputParamsOptions;
    where: Record<string, any>;
}

export interface SingleDataInputParams {
    record_data?: Record<string, any>;
    options?: { transaction_id?: string; };
}

export interface DataInputParams {
    record_data?: Record<string, any>[];
    options?: { transaction_id?: string; ignore_duplicates?: boolean };
}

export interface UpdateDataInputParams {
    record_data?: Record<string, any>;
    where: Record<string, any>;
    options?: { transaction_id?: string; };
}

export interface AdjustNumericColumnParams {
    field: string;
    amount?: number;
    where: Record<string, any>;
    options?: { transaction_id?: string }
}

export interface DestroyDataInputParams {
    where: Record<string, any>;
    options?: { transaction_id?: string; };
}


export interface QueryBuilderObject {
    fields: string[];
    where: Record<string, any>;
    includes: IncludeQuery[];
    order_by?: string;
    order_direction?: "ASC" | "DESC" | string;
    limit?: number;
    offset?: number;
    distinct?: boolean;
    lock?: string;
    transaction_id?: string
}

export interface DataQueryBuilderObject {
    record_data: Record<string, any>[];
    where?: Record<string, any>;
    transaction_id?: string;
    ignore_duplicates?: boolean;
}

export interface ChangeDataQueryBuilderObject {
    record_data?: Record<string, any>[];
    where: Record<string, any>;
    transaction_id?: string;
}

export interface ColumnInputParams { column_name: string; }

export interface ColumnIndexInputParams { fields: string[]; unique: boolean }
