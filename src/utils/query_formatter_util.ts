
import { 
    InputParamsOptions,
    IncludeQuery,
    ColumnDefinition
} from "../types/model_type";

import {
    GenerateJoinParams,
    GenerateSubQueryFieldParams,
    DialectOptions
} from "../types/query_builder_type";

import SQLRaw from "./sql_raw_util";
import InputValidationUtil from "../utils/input_validation_util";

class QueryFormatterUtil {
    private static readonly permission_map  = { 
        read: "SELECT", 
        create: "INSERT", 
        update: "UPDATE", 
        delete: "DELETE",
        create_table: "CREATE",
        drop_table: "DROP",
        alter_table: "ALTER"
    };

   // Private Method Handles nested OR / AND logic conditions
    private static handleNestedLogicalCondition(table_name: string, key: string, conditionGroup: Record<string, any>): string {
        const conditions = conditionGroup[key];

        if (!Array.isArray(conditions)) {
            throw new Error(`❌ "${key}" condition must be an array`);
        }

        const parsed_conditions = conditions
            .map(cond => `(${this.parseWhereCondition(table_name, cond)})`)
            .join(` ${key} `);

        return `(${parsed_conditions})`;
    }

    // Private method that Formats a condition expression based on the given operator
    private static formatOperandExpression(qualified_key: string, operator: string, operand: any, like_op: string = "LIKE"): string {
        const op = operator.toUpperCase();

        switch (op) {
            case "=":
            case "IS":
                return operand === null || operand === undefined
                    ? `${qualified_key} IS NULL`
                    : `${qualified_key} = ${this.escapeValue(operand)}`;

            case "!=":
            case "<>":
            case "IS NOT":
                return operand === null || operand === undefined
                    ? `${qualified_key} IS NOT NULL`
                    : `${qualified_key} != ${this.escapeValue(operand)}`;

            case ">":
            case "<":
            case ">=":
            case "<=":
                return `${qualified_key} ${op} ${this.escapeValue(operand)}`;

            case "IN":
                if (!Array.isArray(operand)) {
                    throw new Error(`❌ IN operator expects an array value`);
                }
                return `${qualified_key} IN (${operand.map(this.escapeValue).join(', ')})`;

            case "LIKE":
                return `${qualified_key} ${like_op} ${this.escapeValue(operand)}`;

            default:
                throw new Error(`❌ [${this.name}] Unsupported operator "${op}"`);
        }
    }

    // Recursively parses a where clause object into SQL conditions
    private static parseWhereCondition(table_name: string, where_obj: Record<string, any>, quote_char: string = "`", like_op: string = "LIKE"): string {
        if (typeof where_obj !== 'object' || where_obj === null || Array.isArray(where_obj)) { 
            throw new Error(`Invalid where clause format`);
        }

        return Object.entries(where_obj)
        .map(
            ([key, value]) => {
                if (key.toUpperCase() === 'OR' || key.toUpperCase() === 'AND') {
                    key = key.toUpperCase() as ("OR" | "AND");
                    return this.handleNestedLogicalCondition(table_name, key, where_obj);
                }
                
                let qualified_field: string;
                if (key.includes('.')) {
                    qualified_field = this.escapeQualifiedField(key, quote_char);
                } 
                else {
                    qualified_field = `${this.escapeField(table_name, quote_char)}.${this.escapeField(key, quote_char)}`;
                }

                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    const [operator, operand] = Object.entries(value)[0];
                    return this.formatOperandExpression(qualified_field, operator, operand, like_op);
                }

            return value === null || value === undefined ? `${qualified_field} IS NULL` : `${qualified_field} = ${this.escapeValue(value)}`;
        }).join(' AND ');
    }

    // Private Method to generate sub query fields clause
    private static generateSubQueryFieldsCluase(fields: string[], table_name: string, quote_char: string = "`"): string[] {
        const sanitized_table_name = this.escapeField(table_name, quote_char);

        const alias = `${sanitized_table_name}_sub`;

        if (!Array.isArray(fields) || fields.length <= 0) { return [`${alias}.*`]; }

        return fields.map(field => { return `'${field}', ${this.escapeField(`${alias}.${field}`, quote_char)}`; })
    }

    // Private Method to  generate join query and fields
    private static generateJoin (input_params: GenerateJoinParams): { fields_clause: string[], join_clause: string[] } {
        const {
            base_table_name, association_type,  target_table_name,  target_fields = ["*"], foreign_key, target_key,
            target_where, target_alias, target_required, quote_char
        } = input_params;

        const alias                 = target_alias || target_table_name;
        const fields_clause         = this.generateFieldsCluase(target_fields, alias, quote_char, true);
        const type                  = target_required ? 'INNER' : 'LEFT';
        const left                  = this.escapeQualifiedField(association_type === 'belongsTo' ? `${alias}.${target_key}` : `${base_table_name}.${foreign_key}`);
        const right                 = this.escapeQualifiedField(association_type === 'belongsTo' ? `${base_table_name}.${foreign_key}` : `${alias}.${target_key}`);
        let where_clause            = `${left} = ${right}`;

        if (target_where) {
            const where_condition = this.parseWhereCondition(alias, target_where).replace(/^AND\s+/, '');
            where_clause += ` AND (${where_condition})`;
        }

        const join_clause  = [`${type} JOIN ${this.escapeQualifiedField(target_table_name, quote_char)} AS ${this.escapeField(alias, quote_char)} ON ${where_clause}`];

        return { fields_clause, join_clause };
    }

    // Private Method to  generate join sub query fields
    private static generateSubQueryField (input_params: GenerateSubQueryFieldParams ): { fields_clause: string[], join_clause: string[] }  {  
        const {
            base_table_name, target_table_name,  target_fields = ["*"], foreign_key, target_key,
            target_where, target_alias, json_agg_fn = "JSON_OBJECT", json_fn = "JSON_ARRAYAGG",
            quote_char = "`"
        } = input_params;

        const alias_name            = (target_alias || target_table_name);
        const fields_clause         = this.generateSubQueryFieldsCluase(target_fields, alias_name, quote_char);
        const sub_alias             = this.escapeField(`${alias_name}_sub`, quote_char);
        let where_clause            = `${this.escapeQualifiedField(`${sub_alias}.${target_key}`)} = ${this.escapeQualifiedField(`${base_table_name}.${foreign_key}`)}`;

        if (target_where) {
            const where_condition = this.parseWhereCondition(sub_alias, target_where).replace(/^AND\s+/, '');
            where_clause += ` AND (${where_condition})`;
        }

        const key_value_pairs = fields_clause.join(', ');

        const sub_query = [`(
            SELECT ${json_agg_fn}(${json_fn}(${key_value_pairs}))
            FROM ${this.escapeQualifiedField(target_table_name, quote_char)} AS ${this.escapeField(sub_alias, quote_char)}
            WHERE ${where_clause}
        ) AS ${this.escapeField(alias_name)}`];

        return { fields_clause: sub_query, join_clause: [] };
    }

    // Method to sanitize query input
    public static sanitizeInput(value: string | undefined, label: string): string {
        if (!value || typeof value !== 'string') {
            throw new Error(`Invalid ${label}: Must be a non-empty string.`);
        }

        return value.replace(/[`"';]/g, '');
    }

    // Method to sanitize query input password
    public static sanitizePassword(value: string | undefined, label: string) {
        const is_valid_password = !InputValidationUtil.isEmpty(value) && InputValidationUtil.isValidPassword(`${value}`);

        if(!is_valid_password) { throw new Error(`Invalid ${label}: Must be a valid password string.`); }

        return value
    }

    // Method to sanitize permissions and retrun sql permissions
    public static sanitizePermissions(value: string[], label: string): string[] {
        return value.map(
            (perm) => {
                const perm_upper = this.permission_map[perm.toLowerCase() as keyof typeof this.permission_map];

                if (!perm_upper) { throw new Error(`Invalid permission: ${perm}`); }

                return perm_upper;
            }
        );
    }

    // Method to Escapes a field name with proper quote characters.
    public static escapeField (field: string, quote_char: string = "`"): string {
        const escaped = field.replace(new RegExp(quote_char, 'g'), quote_char + quote_char);
        return `${quote_char}${escaped}${quote_char}`;
    };

    // Method to Escapes a fully qualified field like "users.id" -> `"users"."id"` or `users`.`id`
    public static escapeQualifiedField (qualified_field: string, quote_char: string = "`" ): string {
        const [table_name, column_name] = qualified_field.split('.');
        return `${this.escapeField(table_name, quote_char)}.${this.escapeField(column_name, quote_char)}`;
    };

    // Method to Escapes a literal value (string, number, array, date, null) 
    public static escapeValue(value: any): string {
        if (typeof value === 'string') { 
            // ✅ Check if value is a RAW expression
            const raw_match = value.match(/^RAW\((.*)\)$/);
            if (raw_match) {
                // return the inner content as-is
                return raw_match[1];
            }
            return `'${value.replace(/'/g, "''")}'`;
         }

        if (value === null || value === undefined) return "NULL";

        if (Array.isArray(value)) { return `(${value.map(v => this.escapeValue(v)).join(', ')})`; }

        if (value instanceof Date) { return `'${value.toISOString()}'`; }

        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            throw new Error('Cannot escape object value directly');
        }
        
        return String(value);
    };

    // MEthod to return fields clause array
    public static generateFieldsCluase(fields: string[], table_name: string, quote_char: string = "`", use_alias: boolean = false): string[] {
        const sanitized_table_name = this.escapeField(table_name, quote_char);

        if (!Array.isArray(fields) || fields.length <= 0) { return [`${sanitized_table_name}.*`]; }

        return fields.map(
            (field: string | SQLRaw) => {
                if (field instanceof SQLRaw) { return field.getExpression(); }
                
                const sanitized_field   = this.escapeField(field, quote_char);
                const base              = `${sanitized_table_name}.${sanitized_field}`;

                if (use_alias) {
                    // Alias as table.field → makes it easier to parse into nested objects
                    const alias     = `${table_name}.${field}`;
                    return `${base} AS ${quote_char}${alias}${quote_char}`;
                }

                return base;
        });
    }

    // Method to return where clause array
    public static generateWhereClause(where: Record<string, any>, table_name: string, quote_char: string = "`", like_op: string = "LIKE"): string[] {
        if (!where || Object.keys(where).length === 0) { return [""]; }

        const condition_str = this.parseWhereCondition(table_name, where, quote_char, like_op);

        return [`WHERE ${condition_str}`];

    }

    // Method to retrun options clause array
    public static generateOptionsClause(options: InputParamsOptions, table_name: string, quote_char: string = "`"): string[] {
        if (!options) { return [""]; }

        const { order_by, order_direction = "DESC", limit, offset, lock} = options;

        let clause = "";

        if(order_by) { clause += ` ORDER BY ${this.escapeQualifiedField(`${table_name}.${order_by}`, quote_char)} ${order_direction}`; }

        if (limit) { clause += ` LIMIT ${limit}`; }

        if (offset !== undefined && offset !== null) { clause += ` OFFSET ${offset}`; }

        if (lock) { clause += ` FOR ${lock}`; }

        return [clause];

    }
   
    // Method to return includes clause array
    public static generateIncludesClause(
        includes: IncludeQuery[], 
        table_name: string, 
        dialect_options: DialectOptions,
        database_name: string | null = null
    ): { fields_clause: string[], join_clause: string[] }  {
        const fields_clause: string[]   = [];
        const join_clause: string[]     = [];

        const { quote_char, json_agg_fn, json_fn } = dialect_options;

        if(!includes || !Array.isArray(includes) || !includes.length) {
            return { fields_clause, join_clause };
        }

        for (const include_query_obj of includes) {
            let sub_fields: string[]   = [];
            let sub_joins: string[]     = [];

            let { 
                target_table_name, foreign_key, target_key, target_fields = ["*"], target_alias, target_is_required,
                target_where, association_type, includes: nested_includes
            } = include_query_obj

            target_table_name = database_name ? `${database_name}.${table_name}` : target_table_name

            if (['hasOne', 'belongsTo'].includes(association_type)) {
                const input_params = { 
                    base_table_name: table_name, association_type, target_table_name, target_fields, foreign_key, 
                    target_key, target_where, target_alias, target_is_required, quote_char 
                };

                ({ fields_clause: sub_fields, join_clause: sub_joins }  = this.generateJoin(input_params));
            } 

            else if (['hasMany', 'belongsToMany'].includes(association_type)) {
                const input_params = { 
                    base_table_name: table_name, target_table_name,  target_fields, foreign_key, target_key,
                    target_where, target_alias, json_agg_fn, json_fn, quote_char
                };

                ({ fields_clause: sub_fields, join_clause: sub_joins }  = this.generateSubQueryField(input_params));
            } 

            fields_clause.push(...sub_fields);
            join_clause.push(...sub_joins);

            if (nested_includes?.length) {
                const nested = this.generateIncludesClause(nested_includes, (target_alias || target_table_name), dialect_options);
                fields_clause.push(...nested.fields_clause);
                join_clause.push(...nested.join_clause);
            }

        }

        return { fields_clause, join_clause };
    }

    // Method to retrun insert fields abd values
    public static generateInsertFieldsAndValues(record_data: Record<string, any>[],  dialect_options: DialectOptions): { fields_clause: string[], values_clause: string[]} {
        const fields_clause: string[]       = [];
        const values_clause: string[]       = [];
        const { quote_char }                = dialect_options;
        const column_names                  = Object.keys(record_data[0]);
        const sanitized_column_names        = column_names.map(col => QueryFormatterUtil.escapeField(col, quote_char));

        if (column_names.length === 0) { throw new Error("Each record must have at least one field"); }

        // Sanitize values
        const sanitized_value_rows    = record_data.map((record) => {
            const values = column_names.map(col => QueryFormatterUtil.escapeValue(record[col]));
            return `(${values.join(", ")})`;
        });

        fields_clause.push(...sanitized_column_names);
        values_clause.push(...sanitized_value_rows);

        return { fields_clause, values_clause };
        
    }

    // method to return set fields = value
    public static generateUpdateFieldsWithValues (record_data: Record<string, any>, table_name: string, dialect_options: DialectOptions): string[] {
        const { quote_char }                = dialect_options;
        const set_clause          = Object.entries(record_data).map(
            ([k, v]) => { return `${this.escapeQualifiedField(`${table_name}.${k}`, quote_char)} = ${this.escapeValue(v)}` }
        );

        return set_clause;
        
    }

    // Private Method to genetae column definition query
    public static generateColumnDefinition (column_name: string, column_definition: ColumnDefinition, table_name: string, dialect_options: DialectOptions): string[] {
        const column_sql = [];
        const { quote_char, data_type_mapper } = dialect_options;
        const { 
            type, auto_increment = false, unique = false, default: default_value, 
            on_update = null, nullable = true, references
        } = column_definition;

        const is_present_def_val= default_value !== undefined && default_value !== null;
        const updated_col_def   = type && type.name && auto_increment ? { ...type, name: `${type.name}_PRIMARY_KEY`} : type;
        const col_def_sql       = data_type_mapper.mapDataType(updated_col_def);
        const base_col_sql      = `${this.escapeField(column_name, quote_char)} ${col_def_sql}`;
        const default_value_sql  = is_present_def_val && default_value === "CURRENT_TIMESTAMP" ? "DEFAULT CURRENT_TIMESTAMP" : `DEFAULT ${this.escapeValue(default_value)}`;

        column_sql.push(base_col_sql);

        if (unique) { column_sql.push("UNIQUE") }

        if (default_value !== undefined) { column_sql.push(default_value_sql); }

        if (nullable === false) { column_sql.push("NOT NULL"); }

        if (references && Object.keys(references).length) {
            const { table, column, on_delete, on_update } = references;

            column_sql.push(`REFERENCES ${this.escapeField(table, quote_char)}(${this.escapeField(column, quote_char)})`)

            if (on_delete) { column_sql.push(`ON DELETE ${on_delete.toUpperCase()}`)}

            if (on_update) { column_sql.push(`ON UPDATE ${on_update.toUpperCase()}`); }
        }

        // Handle auto-update column like `ON UPDATE CURRENT_TIMESTAMP`
        if (on_update === 'CURRENT_TIMESTAMP') { column_sql.push("ON UPDATE CURRENT_TIMESTAMP"); }

        return column_sql;
    }

    // Method to retrun create table columns 
    public static generateColumnsDefinitionClause (columns:Record<string, ColumnDefinition>, primary_key: string, table_name: string, dialect_options: DialectOptions): string[] {
        const column_def_clause = []
       
        for (const [col, def] of Object.entries(columns)) {
            const col_definition_sql = this.generateColumnDefinition(col, def, table_name, dialect_options);

            column_def_clause.push(col_definition_sql.join(" "));
        }

        if (primary_key) { 
            column_def_clause.push(`PRIMARY KEY (${this.escapeField(primary_key, dialect_options?.quote_char)})`) 
        }

        return column_def_clause;
        
    }
}

export default QueryFormatterUtil;