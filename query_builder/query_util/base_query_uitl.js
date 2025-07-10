const LoggerUtil = require("../../utils/logger_util");

class BaseQueryUtil {
    constructor(dialect = "mysql", schema = {}, associations = [],  logger = null) {
        this.name               = "base_query_util";
        this.dialect            = dialect.toLowerCase();
        this.schema             = schema;
        this.associations       = associations;

        this.like_op            = "LIKE";
        this.quote_char         = this.dialect === "postgres" ? '"' : '`';
        this.json_fn            = this.dialect === "postgres" ? "json_build_object" : "JSON_OBJECT";
        this.json_agg_fn        = this.dialect === "postgres" ? "json_agg" : "JSON_ARRAYAGG";
        this.data_typer_mapper  = null
        this.logger             = logger || new LoggerUtil(this.name);
    }

    // Method to Escapes a field name with proper quote characters (MySQL: `col`, Postgres: "col").
    escapeField (field) {
        const quote_char = this.quote_char;
        const escaped = field.replace(new RegExp(quote_char, 'g'), quote_char + quote_char);
        return `${quote_char}${escaped}${quote_char}`;
    };

    // Method to Escapes a fully qualified field like "users.id" -> `"users"."id"` or `users`.`id`
    escapeQualifiedField (qualified) {
        const [table, column] = qualified.split('.');
        return `${this.escapeField(table)}.${this.escapeField(column)}`;
    };

    // Method to Escapes a literal value (string, number, array, date, null)
    escapeValue (value) {
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
        }
        if (Array.isArray(value)) {
            return `(${value.map(v => this.escapeValue(v)).join(', ')})`;
        }
        if (value instanceof Date) {
            return `'${value.toISOString()}'`;
        }
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            throw new Error('Cannot escape object value directly');
        }
        
        return value === null ? 'NULL' : value.toString();
    };

    // Method to Formats ORDER BY, LIMIT, OFFSET, LOCK options into SQL clause
    formatExtraOptions (table_name, options = null) {
        if (!options) { return ""; }

        const { limit, offset, order_by, lock } = options;

        let clause = '';

        if (Array.isArray(order_by) && order_by.length === 2) {
            const [sort_by, direction] = order_by;
            clause += ` ORDER BY ${this.escapeField(table_name)}.${this.escapeField(sort_by)} ${direction}`;
        }

        if (limit) { clause += ` LIMIT ${limit}`; }

        if (offset) { clause += ` OFFSET ${offset}`; }

        if (lock) { clause += ` FOR ${lock}`; }

        return clause;
    }

    // Method to Formats SELECT fields into escaped SQL snippet
    formatSelectFields (table_name, fields = []) {
        if (!fields || fields.length === 0) {
            this.logger.info(`[${this.name}] No fields specified. Defaulting to "*".`);
            fields = ["*"];
        }
        return fields.map((f) => {
            if  (f === '*') {
                return `${this.escapeField(table_name)}.*`;
            }

            else if (!f.includes('.')) {
                return `${this.escapeField(table_name)}.${this.escapeField(f)} AS ${this.escapeField(`${table_name}.${f}`)}`
            }

            else { return `${this.escapeField(f)} AS ${this.escapeField(`${f}`)}` }
        })
        .join(', ');
    }

    // Method to Formats WHERE clause object into SQL snippet
    formatWhereClause (table_name, where = null) {
        try {
            if (!where || Object.keys(where).length === 0) {
                this.logger.info(`[${this.name}] No WHERE conditions provided`);
                return "";
            }

            const condition_str = this._parseWhereCondition(table_name, where);

            return `WHERE ${condition_str}`;
        }
        catch (error) {
            this.logger.error(`[${this.name}] Error formatting WHERE clause: ${error?.message}`);
            throw error;
        }
    }

    // Method to format include
    formatIncludes (base_table, includes = []) {
        let joins = [], extra_fields = [];

        for (const include_obj of includes) {
            const association       = this._resolveAssociation(base_table, include_obj);
            const alias             = include_obj?.as || association?.model?.schema?.table_name;
            let nested              = { joins: [], fields: "" };
            let sub_query           = null

            if (include_obj?.include?.length) {
                nested = this.formatIncludes(alias, include_obj.include);
            }

            if (['hasOne', 'belongsTo'].includes(association?.type)) {
                sub_query  = this._generateJoin(base_table, association, include_obj);
            } 
            else if (['hasMany', 'belongsToMany'].includes(association?.type)) {
                sub_query = this._generateSubQueryField(base_table, association, include_obj);
            } 
            else {
                const msg = `[${this.name}] Unsupported association type: ${association?.type}`;
                this.logger.error(msg);
                throw new Error(msg);
            }

            const { join, fields }          = sub_query
            const formatted_fields          = fields?.trim()?.replace(/,+\s*$/, '');
            const formatted_nested_fields   =  nested?.fields ? nested?.fields?.trim()?.replace(/,+\s*$/, '') : "";
            const all_fields                = `${formatted_fields}, ${formatted_nested_fields}`.replace(/,+\s*$/, '');

            joins.push(join, ...nested.joins);
            extra_fields.push(all_fields);
        }

        return { joins, fields: extra_fields.filter(Boolean).join(', ') };
    };

    // Method to format column definition
    formatColumnDefinition (table_name, column_name, options) {
        const { 
            type = {}, auto_increment = false, unique = false, default: default_value, 
            on_update = null, nullable = true, references = {} 
        } = options;

        const col_def_type_obj  = type && type.name && auto_increment ? { ...type, name: `${type.name}_PRIMARY_KEY`} : type;
        const sql_col_type      = this.data_typer_mapper.mapDataType(col_def_type_obj);

        let col_definition_sql  = `${this.escapeField(column_name)} ${sql_col_type}`;
        let trigger_sql         = null;

        if (unique) { col_definition_sql += ' UNIQUE'; }

        if (default_value !== undefined) {
            col_definition_sql += default_value === 'CURRENT_TIMESTAMP' ? ' DEFAULT CURRENT_TIMESTAMP' : ` DEFAULT ${this.escapeValue(default_value)}`;
        }

        if (nullable === false) { col_definition_sql += ' NOT NULL'; }

        if (references && Object.keys(references).length) {
            const { table, column, on_delete, on_update } = references;

            col_definition_sql += ` REFERENCES ${this.escapeField(table)}(${this.escapeField(column)})`;

            if (on_delete) col_definition_sql += ` ON DELETE ${on_delete.toUpperCase()}`;

            if (on_update) col_definition_sql += ` ON UPDATE ${on_update.toUpperCase()}`;
        }


        if (on_update === 'CURRENT_TIMESTAMP') {
            const { def_sql, trigger_function_sql } = this._getUpdatedAtTriggerSQL(table_name, column_name);
            
            if(def_sql) { col_definition_sql += ' ON UPDATE CURRENT_TIMESTAMP'; }

            trigger_sql = trigger_function_sql
        }

        return { col_definition_sql, trigger_sql };
    }

    // Protected Method to Handles nested OR / AND logic conditions
    _handleNestedLogicalCondition (table_name, key, condition_group) {
        const conditions = condition_group[key];

        if (!Array.isArray(conditions)) {
            const msg = `❌ [${this.name}] "${key}" condition must be an array`;
            this.logger.error(msg)
            throw new Error(msg);
        }
        
        const parsed = conditions.map((cond) => {
            return `(${this._parseWhereCondition(table_name, cond)})`
        })
        .join(` ${key} `);

        return `(${parsed})`;
    }

    // Protected Method to Formats a single operator expression (e.g. `id > 3`, `name IN (...)`)
    _formatOperandExpression (qualified_key, operator, operand) {
        const op = operator.toUpperCase();
        switch (op) {
            case "=":
            case "!=":
            case ">":
            case "<":
            case ">=":
            case "<=":
                return `${qualified_key} ${op} ${this.escapeValue(operand)}`;

            case "IN":
                return `${qualified_key} IN ${this.escapeValue(operand)}`;

            case "LIKE":
                const like_op = this.like_op;
                return `${qualified_key} ${like_op} ${this.escapeValue(operand)}`;

            default:
                throw new Error(`❌ [${this.name}] Unsupported operator "${op}"`);
        }
    };

    // Protected Method to Recursively parses a where clause object
    _parseWhereCondition (table_name, where_obj) {
        if (typeof where_obj !== 'object' || where_obj === null || Array.isArray(where_obj)) {
            const msg = `[${this.name}] Invalid where clause format`;
            this.logger.error(msg);
            throw new Error(msg);
        }

        return Object.keys(where_obj).map(key => {
            const value = where_obj[key];

            if (key === 'OR' || key === 'AND') {
                return this._handleNestedLogicalCondition(table_name, key, where_obj);
            }

            const qualified_field = `${this.escapeField(table_name)}.${this.escapeField(key)}`;

            if (typeof value === 'object' && value !== null) {
                const operator  = Object.keys(value)[0].toUpperCase();
                const operand   = value[operator];
                return this._formatOperandExpression(qualified_field, operator, operand);
            } else {
                return `${qualified_field} = ${this.escapeValue(value)}`;
            }
        }).join(' AND ');
    }

    // Protected Method to resolve association
    _resolveAssociation (base_table, include) {
        const associations          = this.associations || [];
        const include_table_name    = include?.model?.schema?.table_name;

        const match = associations.find(a => {
            const tgt               = a.model?.schema?.table_name;
            const matches_table     = tgt === include_table_name;
            const matches_alias     = include?.as && a?.as ? include.as === a.as : false;
            return matches_table && matches_alias;
        });

        if (!match) { 
            const msg = `[${this.name}] Association not found for ${base_table} in include.`;
            this.logger.error(msg)
            throw new Error(msg); 
        }
        return match;
    }

    // Protected Method to  generate join query and fields
    _generateJoin (base_table, association, include) {
        const { model: target_model, foreign_key, target_key } = association;

        const target_table          = target_model?.schema?.table_name;
        const all_fields            = Object.keys(target_model?.schema?.columns);
        const target_fields         = include?.fields?.length && include?.fields?.includes('*') ? all_fields : include?.fields || all_fields;
        const alias                 = include?.as || target_table;
        const required              = include.required !== false;
        const type                  = required ? 'INNER' : 'LEFT';
        const left                  = this.escapeQualifiedField(association.type === 'belongsTo' ? `${alias}.${target_key}` : `${base_table}.${foreign_key}`);
        const right                 = this.escapeQualifiedField(association.type === 'belongsTo' ? `${base_table}.${foreign_key}` : `${alias}.${target_key}`);
        let where_clause            = `${left} = ${right}`;

        if (include?.where) {
            const where_condition = this._parseWhereCondition(alias, include.where).replace(/^AND\s+/, '');
            where_clause += ` AND (${where_condition})`;
        }

        const fields    = this.formatSelectFields(alias, target_fields);
        const join      = `${type} JOIN ${this.escapeField(target_table)} AS ${this.escapeField(alias)} ON ${where_clause}`;

        return { join, fields };
    }

    // Protected method to prepare sub query meta data
    _prepareSubQueryMetaData (base_table, association, include) {
        if (include?.include?.length) {
            const msg = `❌ [${this.name}] Nested includes are not supported in subqueries (hasMany/belongsToMany) for alias "${include.as || association?.model?.schema?.table_name}".`;
            this.logger.error(msg);
            throw new Error(msg);
        }

        const { model: target_model, foreign_key, target_key } = association;

        const target_table      = target_model?.schema?.table_name;
        const plain_alias       = include.as || target_table;
        const alias             = `${plain_alias}_sub`;
        const all_fields        = Object.keys(target_model?.schema?.columns || {});
        const resolved_fields   = include?.fields?.includes('*') ? all_fields : (include?.fields || all_fields);

        let where_clause = `${this.escapeQualifiedField(`${alias}.${target_key}`)} = ${this.escapeQualifiedField(`${base_table}.${foreign_key}`)}`;

        if (include?.where) {
            const extra_condition = this._parseWhereCondition(alias, include.where).replace(/^AND\s+/, '');
            where_clause += ` AND (${extra_condition})`;
        }

        return { target_table, plain_alias, alias, resolved_fields, where_clause };
    };

    // Protected method to generate sub query field
    _generateSubQueryField (base_table, association, include) {
        const { target_table, plain_alias, alias, resolved_fields, where_clause } = this._prepareSubQueryMetaData(base_table, association, include);

        const key_value_pairs = resolved_fields.map(field => {
            return `'${field}', ${this.escapeQualifiedField(`${alias}.${field}`)}`;
        }).join(', ');
        
        const sub_query = `(
            SELECT ${this.json_agg_fn}(${this.json_fn}(${key_value_pairs}))
            FROM ${this.escapeField(target_table)} AS ${this.escapeField(alias)}
            WHERE ${where_clause}
        ) AS ${this.escapeField(plain_alias)}`;

        return { join: null, fields: sub_query };
    }

    // Protected method to get on update trigger function sql
    _getUpdatedAtTriggerSQL (table_name, column_name) { 
        if(this.dialect == "mysql") {
            return { def_sql: " ON UPDATE CURRENT_TIMESTAMP", trigger_function_sql: null }
        }

        else if ( this.dialect == "postgres") {
            const trigger_name  = `trg_${column_name}_on_update`;
            const function_name = `fn_${column_name}_on_update`;
            const trigger_sql = `
                CREATE OR REPLACE FUNCTION ${function_name}() RETURNS TRIGGER AS $$
                BEGIN
                    NEW.${column_name} = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER ${trigger_name}
                BEFORE UPDATE ON ${this.escapeField(table_name)}
                FOR EACH ROW
                EXECUTE FUNCTION ${function_name}();
            `;
            return { def_sql: null, trigger_function_sql: trigger_sql.replace(/\s+/g, ' ').trim() };
        }
    }
}

module.exports = BaseQueryUtil;