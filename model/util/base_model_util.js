
const EventSystem           = require("../../utils/event_system_util");
const GlobalVariableManager = require("../../utils/global_variable_manager");
const LoggerUtil            = require("../../utils/logger_util");

const DatasourceRegistry    = require("../../datasource/registry/datasource_registry");
const QueryBuilderMapper    = require("../../query_builder/mapper/query_builder_mapper");


class BaseModelUtil {
    constructor(schema, associations, logger = null) {
        this.name                       = "base_model_util";
        this.schema                     = schema;
        this.associations               = associations;
        this.table_name                 = schema?.table_name;
        this.model_name                 = schema?.model_name;
        this.datasource_name            = schema?.datasource_name;
        this.dialect                    = schema?.datasource_type;
        this.table_columns              = schema?.columns;
        this.permissions                = schema?.permissions || []

        this.logger                     = logger || new LoggerUtil(this.name);
        this.datasource_registry        = DatasourceRegistry.getInstance();
        this.global_vars                = GlobalVariableManager.getInstance();
        this.event_system               = new EventSystem();
        this.numeric_types              = ['bigint', 'integer', 'double', 'real', "float", "double_precision", "decimal", "numeric"];
    }


    // Get registered data source connection
    getConnector = () => { 
        const connector = this.datasource_registry.getDataSource(this.datasource_name);

        if (!connector) {
            const msg = `[${this.name}] No connector found for datasource_name: ${this.datasource_name}`;
            this.logger.error(msg)
            throw new Error(msg);
        }
        return connector;
    }

    // Get query builder for data source
    getQueryBuilder = () => { 
        const QueryBuilderClass = QueryBuilderMapper(this.dialect, this.logger);

        if(!QueryBuilderClass) {
            const msg = `[${this.name}] No Query builder for datasource_type: ${this.dialect}`;
            this.logger.error(msg)
            throw new Error(msg);
        }

        return new QueryBuilderClass(this.schema, this.associations, this.logger);
        
    }

    // Register an event listener for the current model
    on = (event, listener) => {
        this.event_system.on(`${this.model_name}:${event}`, listener);
    }

    // Trigger an event in the current model
    triggerHook = (hook, data, options) => {
        return this.event_system.emit(`${this.model_name}:${hook}`, data, options);
    }

    // method to validate db permission
    validatePermission = (action) => {
        const app_id = this.global_vars.getVariable("APP_ID"); // If this is how it's set
        if (!this.permissions.includes(action)) {
            const msg = `[${this.name}] Permission denied: ${action} not allowed on model ${this.model_name} for app ${app_id}.`;
            this.logger.error(msg);
            throw new Error(msg);
        }

        return true;
    }

    // method to sanitice input data
    sanitizeDataFields = (data) => {
        const allowed_fields = Object.keys(this.table_columns || {});

        return Object.fromEntries(Object.entries(data).filter(([key]) => allowed_fields.includes(key)));
    }

    // Method to get a unique array
    getUniqueArray = (arr) => {
        const seen          = new Set();
        const unique_array  = [];
    
        for (const item of arr) {
            const key = typeof item === 'object' && item !== null ? JSON.stringify(item, Object.keys(item).sort())  : item;
    
            if (!seen.has(key)) {
                seen.add(key);
                const sanitzed_fields = this.sanitizeDataFields(item);
                unique_array.push(sanitzed_fields);
            }
        }
    
        return unique_array;
    }

    // Method to get row value based on keys
    getFieldValue = (row, field, full_key) => {
        if (Object.prototype.hasOwnProperty.call(row, field)) { return { present: true, value: row[field]}; }

        if (Object.prototype.hasOwnProperty.call(row, full_key)) { return { present: true, value: row[full_key] }; }

        return { present: false, value: null};
    };

    // Method to serialize row include
    serializeIncludedModel = (row, include) => {
        const alias           = include.as || include.model?.schema?.table_name;
        const included_model  = include?.model;
        const nested_includes  = include.include || [];
        const result          = {};

        if (Array.isArray(row[alias])) {
            return row[alias].map(item => {
                const data = this.serializeRowResult(included_model?.schema, item, nested_includes, alias);
                return new included_model(data);
            });
        }

        if (row[alias]) {
            const data = this.serializeRowResult(included_model?.schema, row[alias], nested_includes, alias);
            return new included_model(data);
        }

        // fallback: try resolving from base row (in case of flattened joins)
        const data = this.serializeRowResult(included_model?.schema, row, nested_includes, alias);
        return new included_model(data);
    }

    // Method to serialize a row result
    serializeRowResult = (schema, row, includes = [], alias = null) => {
        const { table_name, columns }   = schema;
        const serialized_result         = {};
        const columns_fields            = Object.keys(columns || {});

        for (const field of columns_fields) {
            const full_key              = `${alias || table_name}.${field}`;
            const { present, value }    = this.getFieldValue(row, field, full_key);

            if(present) { serialized_result[field] = value; }
        }

        for (const include of includes) {
            const alias = include.as || include.model?.schema?.table_name;
            serialized_result[alias] = this.serializeIncludedModel(row, include);
        }

        return serialized_result

    }

    // Method to get query method param obj
    getConnectorAndQuery = (query_params ) => {
        const { query_method_name, fields, where, options, amount, data = {} } = query_params;

        const { _, queryMethod }   = this.#getQueryMethod(query_method_name);
        const connector            = this.getConnector();
        const params               = { schema: this.schema, fields, where, options, data, amount, table_name: this.table_name, table_columns: this.table_columns};
        const query                 = queryMethod(params);

        return { connector, query }
    }

    getCountConnectorAndQuery = (query_params ) => {
        const { query_method_name, fields, where, options, data = {} } = query_params;


        const { query_builder, queryMethod }    = this.#getQueryMethod(query_method_name);
        const connector                         = this.getConnector();
        const params                            = { schema: this.schema, fields, where, options, data, table_name: this.table_name, table_columns: this.table_columns}
        const count_query                       = query_builder.selectCount(params);
        const data_query                        = queryMethod(params);

        return { connector, count_query, data_query }
    }

    #getQueryMethod = (query_method_name) => {
        const query_builder = this.getQueryBuilder();
        const queryMethod = query_builder?.[query_method_name]?.bind(query_builder);

        if (typeof queryMethod !== 'function') {
            const msg = `[${this.name}] Query method '${query_method_name}' not found on query builder`;
            this.logger.error(msg);
            throw new Error(msg);
        }

        return { query_builder, queryMethod };
    }

    // Method to validate select query method input
    validateSelectQueryInputs = (fields, where) => {
        if (!Array.isArray(fields)) {
            const msg = `[${this.name}] Invalid Query Input 'fields' should be an array`;
            this.logger.error(msg)
            throw new Error(msg);
        }

        if(typeof where !== "object") {
            const msg = `[${this.name}] Invalid Query Input 'where' should be an array`;
            this.logger.error(msg)
            throw new Error(msg);
        }

        return true
    }

    // Method to validate insert update query method input
    validateInsertUpdateQueryInputs = (data, where) => {
        if(!data || !where) {
            const msg = `[${this.name}] Invalid Query Input 'data' and 'where' should be an array`;
            this.logger.error(msg)
            throw new Error(msg);
        }


        if(!Array.isArray(data) && !typeof data == "object" ) {
            const msg = `[${this.name}] Invalid Query Input 'data' should be an object or an array`;
            this.logger.error(msg)
            throw new Error(msg);
        }

        if (Array.isArray(data) && data.length <= 0) {
            const msg = `[${this.name}] Invalid Query Input 'data' should be an array with elements`;
            this.logger.error(msg)
            throw new Error(msg);
        }

        if(typeof data == "object" &&  Object.keys(data).length <= 0) {
            const msg = `[${this.name}] Invalid Query Input 'data' should be an object with fields`;
            this.logger.error(msg)
            throw new Error(msg);
        }

        if(typeof where !== "object") {
            const msg = `[${this.name}] Invalid Query Input 'where' should be an array`;
            this.logger.error(msg)
            throw new Error(msg);
        }

        return true
    }

    // Method to validate increment decreemnt query method input
    validateIncrementDecrementQueryInputs = (fields, where, amount = 1) => {
        if (!fields || !where || !amount) {
            const msg = `[${this.name}] Invalid Query Input: 'fields', 'amount', and 'where' are required.`;
            this.logger.error(msg);
            throw new Error(msg);
        }

        if (!Array.isArray(fields) || fields.length === 0) {
            const msg = `[${this.name}] Invalid Query Input: 'fields' must be a non-empty array.`;
            this.logger.error(msg);
            throw new Error(msg);
        }

        if (typeof where !== "object" || where === null) {
            const msg = `[${this.name}] Invalid Query Input: 'where' must be an object.`;
            this.logger.error(msg);
            throw new Error(msg);
        }

        if (isNaN(amount)) {
            const msg = `[${this.name}] Invalid Query Input: 'amount' must be a valid number.`;
            this.logger.error(msg);
            throw new Error(msg);
        }

        for (const field of fields) {
            const column_meta = this.table_columns?.[field];

            if (!column_meta) {
                const msg = `[${this.name}] Invalid Field: '${field}' does not exist in the model's table columns.`;
                this.logger.error(msg);
                throw new Error(msg);
            }

            const field_type = column_meta.type?.name?.toLowerCase();

            if (!this.numeric_types.includes(field_type)) {
                const msg = `[${this.name}] Invalid Field Type: '${field}' is of type '${field_type}', which is not numeric (allowed: ${numericTypes.join(', ')}).`;
                this.logger.error(msg);
                throw new Error(msg);
            }
        }

        return true
    }

    // Method to validate delete query method input
    validateDeleteQueryInputs = (where) => {
        if (typeof where !== "object" || where === null) {
            const msg = `[${this.name}] Invalid Query Input: 'where' must be an object.`;
            this.logger.error(msg);
            throw new Error(msg);
        }
    }

}

module.exports = BaseModelUtil;