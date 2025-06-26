const QueryUtilMapper  = require("../mapper/query_util_mapper");
const LoggerUtil       = require("../../utils/logger_util");

class BaseQueryBuilder {
    constructor(dialect, schema = {}, associations = [], logger = null) {
        this.name               = "base_query_builder";
        this.dialect            = dialect;
        this.schema             = schema
        this.table_name         = schema?.table_name;
        this.table_columns      = schema?.columns;

        this.logger             = logger || new LoggerUtil(this.name);
        this.QueryUtil          = QueryUtilMapper(dialect, logger);
        this.query_util         = new this.QueryUtil(dialect, schema, associations, this.logger);
    }

    // Method to generate a SELECT query
    select (query_params) {
        try {
            const { fields = [], where = {}, options = {} } = query_params;

            const { distinct = false, include = [] }     = options;

            const escaped_table_name                    = this.query_util.escapeField(this.table_name);
            const distinct_clause                       = distinct ? 'DISTINCT' : '';
            const base_fields                           = this.query_util.formatSelectFields(this.table_name, fields);
            const { joins, fields: include_fields }     = this.query_util.formatIncludes(this.table_name, include);
            const all_fields                            = [base_fields, include_fields].filter(Boolean).join(', ').replace(/,\s*$/, '');
            const join_clause                           = joins?.join(' ') || '';
            const where_clause                          = this.query_util.formatWhereClause(this.table_name, where);
            const extras_clause                         = this.query_util.formatExtraOptions(this.table_name, options);

            const sql = `
                SELECT ${distinct_clause} ${all_fields}
                FROM ${escaped_table_name}
                ${join_clause}
                ${where_clause}
                ${extras_clause};
            `;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] select query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate a SELECT COUNT() query
    selectCount (query_params) {
        try {
            const { where = {}, options = {} } = query_params;

            const { distinct = false, include = [] }     = options;

            const formatted_options = { ...options, limit: null, offset: null }   
            const escaped_table_name= this.query_util.escapeField(this.table_name);
            const distinct_clause   = distinct ? 'DISTINCT' : '';
            const { joins }         = this.query_util.formatIncludes(this.table_name, include);
            const join_clause       = joins?.join(' ') || '';
            const where_clause      = this.query_util.formatWhereClause(this.table_name, where);
            const extras_clause     = this.query_util.formatExtraOptions(this.table_name, formatted_options);
            
            const sql = `
                SELECT ${distinct_clause} COUNT(*) as count
                FROM ${escaped_table_name}
                ${join_clause}
                ${where_clause}
                ${extras_clause};
            `;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] selectCount query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate INSERT query
    insert (query_params) {
        try {
            const { data }              = query_params;
            const escaped_table_name    = this.query_util.escapeField(this.table_name);
            const columns               = Object.keys(data).map(this.query_util.escapeField).join(', ');
            const values                = Object.values(data).map(this.query_util.escapeValue).join(', ');


            const sql = `INSERT INTO ${escaped_table_name} (${columns}) VALUES (${values});`;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] insert query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate BULKINSERT query
    bulkInsert (query_params) {
        try {
            const { data: data_array } = query_params;

            if (!Array.isArray(data_array) || data_array.length === 0) { 
                const msg = `[${this.name}] Invalid value providedfor bulk insert data array ${data_array}`;
                this.logger.error(msg);
                throw new Error(msg); 
            }

            const table_column_fields   = Object.keys(this.table_columns);
            const escaped_table_name    = this.query_util.escapeField(this.table_name);
            const first_row             = data_array[0];
            const data_columns          = Object.keys(first_row).filter(key => Object.hasOwn(this.table_columns, key));
            const cols                  = data_columns.map(this.query_util.escapeField).join(', ');
            const value_tuples          = data_array.map(row => {
                const row_values = data_columns.map(col => this.query_util.escapeValue(row[col]));
                return `(${row_values.join(', ')})`;
            }).join(', ');

            const sql = `INSERT INTO ${escaped_table_name} (${cols}) VALUES ${value_tuples};`;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] bulkInsert query generate method failed`, { error });
            throw error;
        }
    };

    // Method to generate UPDATE query
    update (query_params) {
        try {
            const {where, data } = query_params;

            const escaped_table_name    = this.query_util.escapeField(this.table_name);
            const where_clause          = this.query_util.formatWhereClause(this.table_name, where)
            const set_clause            = Object.entries(data).map(
                ([k, v]) => `${this.query_util.escapeQualifiedField(`${this.table_name}.${k}`)} = ${this.query_util.escapeValue(v)}`
            ).join(', ');

            const sql = `UPDATE ${escaped_table_name} SET ${set_clause} ${where_clause};`;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] update query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate INCREMENT UPDATE query
    increment (query_params) {
        try {
            const { where, fields, amount = 1 } = query_params;

            const escaped_table_name= this.query_util.escapeField(this.table_name);
            const field_list         = Array.isArray(fields) ? fields : [fields];

            if (field_list.length === 0) {
                throw new Error(`[${this.name}] increment method requires at least one field`);
            }

            // Build SET clause for all fields
            const set_clause = field_list.map(field => {
                const escaped_field = this.query_util.escapeQualifiedField(`${this.table_name}.${field}`);
                return `${escaped_field} = ${escaped_field} + ${this.query_util.escapeValue(amount)}`;
            }).join(", ");

            const where_clause      = this.query_util.formatWhereClause(this.table_name, where)

            const sql               = `UPDATE ${escaped_table_name} SET ${set_clause} ${where_clause};`;
            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] increment query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate DECREMENT UPDATE query
    decrement (query_params) {
        try {
            const { where, fields, amount = 1 } = query_params;

            const escaped_table_name= this.query_util.escapeField(this.table_name);
            const field_list         = Array.isArray(fields) ? fields : [fields];

            if (field_list.length === 0) {
                throw new Error(`[${this.name}] increment method requires at least one field`);
            }

            // Build SET clause for all fields
            const set_clause = field_list.map(field => {
                const escaped_field = this.query_util.escapeQualifiedField(`${this.table_name}.${field}`);
                return `${escaped_field} = ${escaped_field} - ${this.query_util.escapeValue(amount)}`;
            }).join(", ");

            const where_clause      = this.query_util.formatWhereClause(this.table_name, where)

            const sql               = `UPDATE ${escaped_table_name} SET ${set_clause} ${where_clause};`;
            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] decrement query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate DELETE query
    delete (query_params) {
        try {
            const { where }             = query_params;
            const escaped_table_name    = this.query_util.escapeField(this.table_name);
            const where_clause          = this.query_util.formatWhereClause(this.table_name, where);

            const sql = `DELETE FROM ${escaped_table_name} ${where_clause};`;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] delete query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate CREATE table query
    createTable () {
        try {
            const { table_name, columns, primary_key } = this.schema;

            const column_sql_parts  = [];
            const triggers          = [];

            const pk                    = primary_key ? `, PRIMARY KEY (${(Array.isArray(primary_key) ? primary_key : [primary_key]).map(this.query_util.escapeField).join(', ')})` : '';
            const escaped_table_name    = this.query_util.escapeField(this.table_name);

            for (const [col, def] of Object.entries(columns)) {
                const { col_definition_sql, trigger_sql } = this.query_util.formatColumnDefinition(table_name, col, def);

                column_sql_parts.push(col_definition_sql);

                if (trigger_sql) { triggers.push(trigger_sql); }
            }

            const create_table_sql = `CREATE TABLE ${escaped_table_name} (${column_sql_parts.join(', ')}${pk});`;

            return {
                create_sql: create_table_sql.replace(/\s+/g, ' ').trim(),
                trigger_sqls: triggers
            };
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] createTable query generate method failed`, { error });
            throw error;
        }
    };

    // Method to generate DROP table query
    dropTable () {
        try {
            const escaped_table_name    = this.query_util.escapeField(this.table_name);
            const sql                   = `DROP TABLE IF EXISTS ${escaped_table_name};`;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] dropTable query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate ADD COLIMN query
    addColumn (column_name, def, position = {}) {
        try {
            const escaped_table_name                    = this.query_util.escapeField(this.table_name);
            const { after, before }                     = position;
            const { col_definition_sql, trigger_sql }   = this.query_util.formatColumnDefinition(this.table_name, column_name, def);

            let pos_clause = '';

            if (after) { pos_clause = `AFTER ${this.query_util.escapeField(after)}`; }

            else if (before) { pos_clause = `BEFORE ${this.query_util.escapeField(before)}`; }

            const alter_sql = `ALTER TABLE ${escaped_table_name} ADD COLUMN ${col_definition_sql} ${pos_clause};`.replace(/\s+/g, ' ').trim();

            return { alter_sql, trigger_sqls: trigger_sql ? [trigger_sql] : [] };

        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] addColumn query generate method failed`, { error });
            throw error;
        }
        

       

        

    };

    // Method to generate DROP COLUMN query
    dropColumn (column_name) {
        try {
            const escaped_table_name    = this.query_util.escapeField(this.table_name);
            const escaped_column_name   = this.query_util.escapeField(column_name);

            const sql = `ALTER TABLE ${escaped_table_name} DROP COLUMN ${escaped_column_name};`;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] dropColumn query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate CREATE INDEX query
    createIndex (index_fields, unique) {
        try {
            const escaped_table_name    = this.query_util.escapeField(this.table_name);
            const fields                = index_fields.map(this.query_util.escapeField).join(', ');
            const index_name            = `idx_${this.table_name}_${index_fields.join('_')}`;
            const escaped_index_name    = this.query_util.escapeField(index_name);
            const unique_clause         = unique ? 'UNIQUE' : '';

            const sql = `CREATE ${unique_clause} INDEX ${escaped_index_name} ON ${escaped_table_name} (${fields});`;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch (error) {
            this.logger.error(`❌ [${this.name}] createIndex query generate method failed`, { error });
            throw error;
        }
    }

    // Method to generate DROP Index query
    dropIndex (index_name) {
        try {
            const escaped_table_name    = this.query_util.escapeField(this.table_name);
            const escaped_index_name    = this.query_util.escapeField(index_name);

            const sql = `DROP INDEX ${escaped_index_name} ON ${escaped_table_name};`;

            return sql.replace(/\s+/g, ' ').trim();
        }
        catch(error) {
            this.logger.error(`❌ [${this.name}] dropIndex query generate method failed`, { error });
            throw error;
        }
    }

}

module.exports = BaseQueryBuilder