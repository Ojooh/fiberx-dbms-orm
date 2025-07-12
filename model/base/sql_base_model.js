const BaseModel         = require("./base_model");

const BaseModelUtil     = require("../util/base_model_util");
const LoggerUtil        = require("../../utils/logger_util");

class SQLBaseModel extends BaseModel {
    // Default static properties (can be overridden by subclasses)
    static schema               = {};
    static associations         = [];
    static _model_util          = null;
    static _logger              = null;
    
    // Dynamically instantiate BaseModelUtil with schema + associations
    static get logger() {
        if (!this._logger) {
            this._logger = new LoggerUtil(this.name || "sql_base_model");
        }
        return this._logger;
    }

    static get model_util () {
        if (!this._model_util) {
            this._model_util = new BaseModelUtil(this.schema, this.associations, this.logger);
        }
        return this._model_util;
    }

    // === Association Methods ===
    // Method to get model associations
    static getAssociations () { return this.associations || []; };

    // Method to register an association
    static registerAssociation = (definition) => {
        if (!this.associations) {  this.associations = []; }

        this.associations.push(definition);
    };

    // Method to set has many relationship
    static hasMany (target, options) {
        return this.registerAssociation({ type: 'hasMany', source: this, model: target, ...options });
    };

    // Method to set has one relationship
    static hasOne (target, options) {
        return this.registerAssociation({ type: 'hasOne', source: this, model: target, ...options });
    };

    // Method to set belongs to relationship
    static belongsTo (target, options){
        return this.registerAssociation({ type: 'belongsTo', source: this, model: target, ...options });
    };

    // Method to set belongs to many relationship
    static belongsToMany (target, options) {
        return this.registerAssociation({ type: 'belongsToMany', source: this, model: target, ...options });
    };

    // === Query Methods ===

    // Method to find record based on primary key condition
    static async findByPk (id, fields = [], options = {}) {
        try {
            const { primary_key }       = this.schema;
            const pk_field              = primary_key?.toString() || "id";
            const where                 = { [pk_field]: id };

            this.model_util.validatePermission("read");

            this.model_util.validateSelectQueryInputs(fields, where);
            
            const query_params          = { query_method_name: "select", fields, where, options: { ...options, limit: 1 } };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);
            const result                = await connector.executeQuery(query, options);
            const row                   = result?.[0] || null;
            const normalized            = row ? this.model_util.serializeRowResult(this.schema, row, options?.include) : null;

            return normalized ? new this(normalized) : null;
        } catch (error) {
            console.error(`[${this.name}] Error in findByPk method`, { error });
            throw error;
        }
    }

    // Method to find a record based on where condition
    static async findOne (fields, where, options = {}) {  
        try { 
            this.model_util.validatePermission("read");

            this.model_util.validateSelectQueryInputs(fields, where);

            const query_params          = { query_method_name: "select", fields, where, options: { ...options, limit: 1 } };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);
            const result                = await connector.executeQuery(query, options);
            const row                   = result?.[0] || null;
            const normalized            = row ? this.model_util.serializeRowResult(this.schema, row, options?.include) : null;

            return normalized ? new this(normalized) : null;
        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in findOne method`, { error });
            throw error;
        }
    }

    // Method to find multiple records based on where condition
    static async findAll (fields, where, options = {}) { 
        try { 
            this.model_util.validatePermission("read");

            this.model_util.validateSelectQueryInputs(fields, where);

            const query_params          = { query_method_name: "select", fields, where, options };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);
            const result                = await connector.executeQuery(query, options);
            
            return result.map((row) => { 
                const normalized_row    = row ? this.model_util.serializeRowResult(this.schema, row, options?.include)  : null
                return normalized_row ? new this(normalized_row) : null;
            });
        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in findAll method`, { error });
            throw error;
        }
    }

    // Method to count number of records based on where condition
    static async count (where, options = {}) { 
        try { 
            this.model_util.validatePermission("read");

            this.model_util.validateSelectQueryInputs([], where);

            const query_params          = { query_method_name: "selectCount", fields: [], where, options };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);
            const result                = await connector.executeQuery(query, options);
            const row                   = result && result.length ? result[0] : null

            return row?.count || 0;

        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in count method`, { error });
            throw error;
        }
    }

    // Method to find and count multiple records based on where condition
    static async findAndCountAll (fields, where, options = {}) { 
        try { 
            this.model_util.validatePermission("read");

            this.model_util.validateSelectQueryInputs(fields, where);

            const query_params                              = { query_method_name: "select", fields, where, options };
            const { connector, count_query, data_query }    = this.model_util.getCountConnectorAndQuery(query_params);
            const [count_result, rows_result]                = await Promise.all([ connector.executeQuery(count_query, options), connector.executeQuery(data_query, options) ]);

            const normalized_rows = rows_result.map((row) => { 
                const normalized_row    = row ? this.model_util.serializeRowResult(this.schema, row, options?.include)  : null
                return normalized_row ? new this(normalized_row) : null;
            });

            return { count: count_result?.[0]?.count || 0, rows: normalized_rows };
        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in findAndCountAll method`, { error });
            throw error;
        }
    }

    // Method to create a reacord
    static async create (data, options = {}) { 
        try { 
            const { table_name } = this.schema;

            this.model_util.validatePermission("create");

            this.model_util.validateInsertUpdateQueryInputs(data, {});

            const sanitzed_fields       = this.model_util.sanitizeDataFields(data);
            const query_params          = { query_method_name: "insert", options, data: sanitzed_fields };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);

            // trigger before create hook
            this.model_util.triggerHook("before_create", sanitzed_fields, options);

            const { insertId: insert_id } = await connector.executeQuery(query, options);

            if(!insert_id) { return new this(sanitzed_fields) }

            const fetch_query       = `SELECT * FROM ${table_name} WHERE id = ? LIMIT 1`;
            const [row]             = await connector.executeQuery(fetch_query, {...options, params: [insert_id] });
            const normalized_row    = this.model_util.serializeRowResult(this.schema, row, options?.include);
            const new_instance      = new this(normalized_row);

            // trigger after create hook
            this.model_util.triggerHook("after_create", new_instance, options);

            return new_instance
        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in create method`, { error });
            throw error;
        }
    }

    // Method to bulk create records
    static async bulkCreate (data, options = {}) { 
        try { 
            const { table_name } = this.schema;

            const { ignore_duplicates = true, include = [] } = options;

            this.model_util.validatePermission("create");

            this.model_util.validateInsertUpdateQueryInputs(data, {});

            const data_array = ignore_duplicates ? this.model_util?.getUniqueArray(data) : data.map((row) => this.model_util.sanitizeDataFields(row));

            const query_params          = { query_method_name: "bulkInsert", options, data: data_array };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);

            // trigger before bulk insert hook
            this.model_util.triggerHook("before_bulk_create", data_array, options);

            const result            = await connector.executeQuery(query, options);
            const new_instances     = data_array.map((row) => { 
                const normalized_row = this.model_util.serializeRowResult(this.schema, row, include);
                return new this(normalized_row);
            });

            // trigger after create hook
            this.model_util.triggerHook("after_bulk_create", new_instances, options);

            return new_instances
        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in bulkCreate method`, { error });
            throw error;
        }
    }
    
    // Method to update record(s) based on where condition
    static  async update (data, where, options = {}) { 
        try { 
            const { table_name, primary_key } = this.schema;

            const pk_field              = primary_key?.toString() || "id";
            const _where                = where || { [pk_field]: data[pk_field] };

            this.model_util.validatePermission("update");

            this.model_util.validateInsertUpdateQueryInputs(data, _where);

            const sanitzed_fields       = this.model_util.sanitizeDataFields(data);
            const query_params          = { query_method_name: "update", where: _where, options, data: sanitzed_fields };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);

            // trigger before update hook
            this.model_util.triggerHook("before_update", sanitzed_fields, options);

            const result = await connector.executeQuery(query, options);

            if (result?.affectedRows === 0) { return false; }

            // trigger after update hook
            this.model_util.triggerHook("after_update", { data, where: _where }, options);
            
            return true;
        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in update method`, { error });
            throw error;
        }
    }

    // Method to increment a record's number based field(s) based on where condition
    static  async increment (fields, where = null, amount = 1, options = {}) { 
        try { 
            this.model_util.validatePermission("update");

            this.model_util.validateIncrementDecrementQueryInputs(fields, where, amount);

            const query_params          = { query_method_name: "increment", fields, where, options, amount };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);

            // trigger before increment hook
            this.model_util.triggerHook("before_increment", { fields, where, amount }, options);

            const result  = await connector.executeQuery(query, options);

            if (result?.affectedRows === 0) { return false; }

            // trigger after increment hook
            this.model_util.triggerHook("after_increment", { fields, where, amount }, options);
            
            return true;
        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in increment method`, { error });
            throw error;
        }
    }   

    // Method to decrement a record's number based field(s) based on where condition
    static  async decrement (fields, where = null, amount = 1, options = {}) { 
        try { 
            this.model_util.validatePermission("update");

            this.model_util.validateIncrementDecrementQueryInputs(fields, where, amount);

            const query_params          = { query_method_name: "decrement", fields, where, options, amount };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);

            // trigger before decrement hook
            this.model_util.triggerHook("before_decrement", { fields, where, amount }, options);

            const result  = await connector.executeQuery(query, options);

            if (result?.affectedRows === 0) { return false; }

            // trigger after decrement hook
            this.model_util.triggerHook("after_decrement", { fields, where, amount }, options);
            
            return true;

        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in decrement method`, { error });
            throw error;
        }
    }

    // Method to delete record(s) based on where condition
    static async destroy (where, options = {}) { 
        try { 
            this.model_util.validatePermission("delete");

            this.model_util.validateDeleteQueryInputs(where);

            const query_params          = { query_method_name: "delete", where, options };
            const { connector, query }  = await this.model_util.getConnectorAndQuery(query_params);

            // trigger before delete hook
            this.model_util.triggerHook("before_delete", { where }, options);

            const result  = await connector.executeQuery(query, options);

            if (result?.affectedRows === 0) { return false; }

            // trigger after delete hook
            this.model_util.triggerHook("after_delete", { where }, options);
            
            return true;
        }
        catch(error) {
            this.logger.error(`[${this.name}] Error in destroy method`, { error });
            throw error;
        }
    }

    constructor(data = {}) {
        super(data);
        Object.assign(this, data); // Assign data to instance properties
    }
}

module.exports = SQLBaseModel;
