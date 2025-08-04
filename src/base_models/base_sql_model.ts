
import { 
    AssociationOptions, 
    AssociationDefinition, 
    SchemaDefinition,
    FindByPkInputParams,
    FindInputParams,
    CountInputParams,
    SingleDataInputParams,
    DataInputParams,
    UpdateDataInputParams,
    AdjustNumericColumnParams,
    DestroyDataInputParams
} from "../types/model_type";

import ModelUtil from "../utils/model_util";
import BaseSQLConnector from "../data_sources/connectors/base_sql_connector";
import DataSourceRegistry from "../data_sources/data_source_registry";
import QueryFormatterUtil from "../utils/query_formatter_util";
import EventSystemUtil from "../utils/event_system_util";


class BaseSQLModel {
    [key: string]: any;
    static schema: SchemaDefinition = {};
    static associations: AssociationDefinition[] = [];

    constructor(data: Record<string, any> = {}) {
        this.initAttributesFromData(data);
    }

    // Method to initialize class attributes
    protected initAttributesFromData(data: Record<string, any>): void {
        const associations = (this.constructor as typeof BaseSQLModel).getAssociations?.() || [];
        const association_map: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            const parts                 = key.split('.', 2);
            const [maybe_alias, field]  = parts;
            const assoc                 = associations.find(a => a.as === maybe_alias);

            if (assoc && assoc.model?.prototype instanceof BaseSQLModel) {
                if (assoc.type === "hasMany" || assoc.type === "belongsToMany") {
                    if (!association_map[maybe_alias]) { association_map[maybe_alias] = []; }

                    association_map[maybe_alias].push({ [field]: value });
                } 
                else {
                    if (!association_map[maybe_alias]) { association_map[maybe_alias] = {}; }

                    association_map[maybe_alias][field] = value;
                }

            } else { this[parts[0]] = value; }
            
        }

        // After looping, initialize associations
        for (const [alias, assoc_data] of Object.entries(association_map)) {
            const assoc = associations.find(a => a.as === alias);

            if (assoc && assoc.model?.prototype instanceof BaseSQLModel) {
                if (assoc.type === "hasMany" || assoc.type === "belongsToMany") {
                    this[alias] = assoc_data.map((data_obj: any) => { return new assoc.model(data_obj); });
                }
                else { this[alias] = new assoc.model(assoc_data); } 
            }
        }
    }

    // Method to check for duplicate associations
    private static hasDuplicateAssociation(def: AssociationDefinition): boolean {
        return this.associations.some(existing =>
            existing.type === def.type &&
            existing.source === def.source &&
            existing.model === def.model &&
            JSON.stringify(existing) === JSON.stringify(def)
        );
    }

    // Method to handle error
    private static handleError(method: string, error: unknown): never {
        const error_obj = error instanceof Error ? error : new Error(`Unknown error in method ${method}: ${error}`);
        throw error_obj
    }

    // Method to get a schemas connector from registry
    private static getSchemaConnector(schema: SchemaDefinition): BaseSQLConnector {
        const registry          = DataSourceRegistry.getInstance();
        const connector        = registry.getConnector(this.schema?.datasource_name || "");

        if (!connector) { this.handleError("getSchemaConnector", `No connector found for schema data source: ${this.schema?.datasource_name}`) }


        return connector
    }

    private static async adjustNumericField(op: "+" | "-", input: AdjustNumericColumnParams): Promise<number> {
        const { field, amount = 1, where, options } = input;

        const action                = op === "+" ? "increment" : "decrement";
        const connector             = this.getSchemaConnector(this.schema);
        const { quote_char }        = connector.query_builder;
        const resolved_field_name   = QueryFormatterUtil.escapeQualifiedField(`${this.schema.table_name}.${field}`, quote_char);
        const raw_expression        = `(${resolved_field_name} ${op} ${amount})`;

        const record_data           = { [field]: raw_expression };
        const update_input_params   = { record_data, where, options };

        const { v_state, v_msg, v_data } = ModelUtil.validateUpdateRequest(update_input_params, this.schema);

        if (!v_state || !v_data) this.handleError(`adjustNumericField(${op})`, v_msg);

        this.emitHook(`before_${action}`, v_data);
        const transaction_id        = v_data.transaction_id || "";
        const sql_query             = connector.query_builder.generateUpdateQuery(v_data, this.schema);
        const { affected_rows = 0 } = await connector.executeQuery(sql_query, { transaction_id });

        this.emitHook(`after_${action}`, v_data, { affected_rows });
        return affected_rows;
    }

    private static emitHook(event: string, payload: any, options: Record<string, any> = {}) {
        const model_name = this.schema?.model_name || this.name;
        EventSystemUtil.emit(`${model_name}:${event}`, payload, options);
    }
    

    // Method to get model associations
    public static getAssociations(): AssociationDefinition[] { return this.associations || []; }

    // ✅ Method to register an association
    public static registerAssociation(definition: AssociationDefinition): void {
        if (!this.associations) { this.associations = []; }

        if (!this.hasDuplicateAssociation(definition)) { this.associations.push(definition); }
    }

    // Method to set has many relationship
    public static hasMany(target: typeof BaseSQLModel, options: AssociationOptions = {}): void {
        this.registerAssociation({ type: "hasMany", source: this, model: target, ...options });
    }

    // Method to set has one relationship
    public static hasOne(target: typeof BaseSQLModel, options: AssociationOptions = {}): void {
        this.registerAssociation({ type: "hasOne", source: this, model: target, ...options });
    }

    // Method to set belongs to relationship
   static belongsTo(target: typeof BaseSQLModel, options: AssociationOptions = {}): void {
        this.registerAssociation({ type: "belongsTo", source: this, model: target, ...options });
    }

    // Method to set belongs to many relationship
    public static belongsToMany(target: typeof BaseSQLModel, options: AssociationOptions = {}): void {
        this.registerAssociation({ type: "belongsToMany", source: this, model: target, ...options });
    }

    // Method to find record based on primary key condition
    public static async findByPk (input_params: FindByPkInputParams): Promise<BaseSQLModel | null> {
        try {
            const { v_state, v_msg, v_data } = ModelUtil.validateFindByPkRequest(input_params, this.schema, this.associations);

            if(!v_state || !v_data) { this.handleError("findByPk", v_msg); }

            v_data.limit            = 1;
            const transaction_id    = v_data?.transaction_id || "";
            const connector         = this.getSchemaConnector(this.schema);
            const sql_query         = connector.query_builder.generateSelectQuery(v_data, this.schema);
            const { success, rows } = await connector.executeQuery(sql_query, { transaction_id });

            if(!success || !rows.length) { return null }

            return new this(rows[0]);
        }
        catch (error: unknown) { this.handleError("findByPk", error); }
    }

    // Method to find a record based on condition(s)
    public static async findOne (input_params: FindInputParams): Promise<BaseSQLModel | null> {
        try {
            const { v_state, v_msg, v_data } = ModelUtil.validateFindRequest(input_params, this.schema, this.associations);

            if(!v_state || !v_data) { this.handleError("findOne", v_msg); }

            v_data.limit            = 1;
            const transaction_id    = v_data?.transaction_id || "";
            const connector         = this.getSchemaConnector(this.schema);
            const sql_query         = connector.query_builder.generateSelectQuery(v_data, this.schema);
            const { success, rows } = await connector.executeQuery(sql_query, { transaction_id });

            if(!success || !rows.length) { return null }

            return new this(rows[0]);
        }
        catch (error: unknown) { this.handleError("findOne", error); }
    }

    // Method to all records based on a condition(s)
    public static async findAll (input_params: FindInputParams): Promise<BaseSQLModel[]> {
        try {
            const { v_state, v_msg, v_data } = ModelUtil.validateFindRequest(input_params, this.schema, this.associations);

            if(!v_state || !v_data) { this.handleError("findOne", v_msg); }

            const transaction_id    = v_data?.transaction_id || "";
            const connector         = this.getSchemaConnector(this.schema);
            const sql_query         = connector.query_builder.generateSelectQuery(v_data, this.schema);
            const { success, rows } = await connector.executeQuery(sql_query, { transaction_id });

            if(!success || !rows.length) { return [] }

            return rows.map((row) => { return new this(row); } );
        }
        catch (error: unknown) { this.handleError("findOne", error); }
    }

    // Method to count records based on contion(s)
    public static async count (input_params: CountInputParams): Promise<number> {
        try {
            const { v_state, v_msg, v_data } = ModelUtil.validateCountRequest(input_params, this.schema, this.associations);

            if(!v_state || !v_data) { this.handleError("count", v_msg); }

            const transaction_id    = v_data?.transaction_id || "";
            const connector         = this.getSchemaConnector(this.schema);
            const sql_query         = connector.query_builder.generateSelectCountQuery(v_data, this.schema);
            const { success, rows } = await connector.executeQuery(sql_query, { transaction_id });

            if(!success || !rows.length) { return 0 }

            return Number(rows[0]?.count || 0);
        }
        catch (error: unknown) { this.handleError("count", error); }
    }

    // Method to handle find and count all based on condition(s)
    public static async findAndCountAll(input_params: FindInputParams): Promise<{ rows: BaseSQLModel[]; count: number }> {
        try {
            const { v_state, v_msg, v_data } = ModelUtil.validateFindRequest(input_params, this.schema, this.associations);

            if (!v_state || !v_data) { this.handleError("findAndCountAll", v_msg); }

            const transaction_id        = v_data.transaction_id || "";
            const connector             = this.getSchemaConnector(this.schema);
            const data_query_params     = { ...v_data };
            const count_query_params    = { ...v_data };

            // Ensure limit/offset only apply to data query
            delete count_query_params.limit;
            delete count_query_params.offset;

            const sql_data_query = connector.query_builder.generateSelectQuery(data_query_params, this.schema);
            const sql_count_query = connector.query_builder.generateSelectCountQuery(count_query_params, this.schema);

            // Run both queries in parallel
            const [data_result, count_result] = await Promise.all([
                connector.executeQuery(sql_data_query, { transaction_id }),
                connector.executeQuery(sql_count_query, { transaction_id }),
            ]);

            if (!data_result.success || !count_result.success) {
                this.handleError("findAndCountAll", "Query execution failed");
            }

            const rows      = data_result.rows.map((row) => new this(row));
            const count     = count_result.rows[0]?.count ?? 0;

            return { rows, count };
        } 
        catch (error: unknown) { this.handleError("findAndCountAll", error); }
    }

    // Method to handle events
    public static onHookEvent (event: string, listener: (payload: any, options?: Record<string, any>) => void): void {
        const model_name = this.schema?.model_name || this.name;
        EventSystemUtil.on(`${model_name}:${event}`, listener);
    }

    // Method to handle create a new record
    public static async create(input_params: SingleDataInputParams): Promise<BaseSQLModel | null>  {
        try {
            const record_data           = input_params?.record_data ?? {};
            const options               = input_params?.options ?? {};
            const create_data_params    = { record_data: [record_data], options };
            const { v_state, v_msg, v_data } = ModelUtil.validateCreateRequest(create_data_params, this.schema);

            if (!v_state || !v_data) { this.handleError("create", v_msg); }

            this.emitHook("before_create", v_data);
            const transaction_id        = v_data.transaction_id || "";
            const connector             = this.getSchemaConnector(this.schema);
            const insert_sql_query      = connector.query_builder.generateInsertQuery(v_data, this.schema);
            const { success, insert_id }= await connector.executeQuery(insert_sql_query, { transaction_id });

            if(!success) { return null }

            if(!insert_id) { return new this(record_data); }

            const primary_key_field         = this.schema?.primary_key || "id";
            const select_data               = { fields: [], where: { [primary_key_field]: insert_id }}
            const select_sql_query          = connector.query_builder.generateSelectQuery(select_data, this.schema);
            const select_result             = await connector.executeQuery(select_sql_query, { transaction_id });

            if(!select_result?.success || !select_result?.rows.length) { return null }

            const new_record = new this(select_result?.rows[0]);

            this.emitHook("after_create", v_data, { new_record });
            return new_record
        } 
        catch (error: unknown) { this.handleError("create", error); }
    }

    // Method to handle create a new record
    public static async bulkCreate(input_params: DataInputParams): Promise<number | null>  {
        try {
            const { v_state, v_msg, v_data } = ModelUtil.validateCreateRequest(input_params, this.schema);

            if (!v_state || !v_data) { this.handleError("bulkCreate", v_msg); }

            const transaction_id        = v_data.transaction_id || "";
            const connector             = this.getSchemaConnector(this.schema);
            const insert_sql_query      = connector.query_builder.generateInsertQuery(v_data, this.schema);
            const { success, affected_rows }= await connector.executeQuery(insert_sql_query, { transaction_id });

            if(!success || !affected_rows) { return null }

            return affected_rows;
        } 
        catch (error: unknown) { this.handleError("bulkCreate", error); }
    }

    // Method to handle create a new record
    public static async update(input_params: UpdateDataInputParams): Promise<number>  {
        try {
            const { v_state, v_msg, v_data } = ModelUtil.validateUpdateRequest(input_params, this.schema);

            if (!v_state || !v_data) { this.handleError("update", v_msg); }

            this.emitHook("before_update", input_params);
            const transaction_id        = v_data.transaction_id || "";
            const connector             = this.getSchemaConnector(this.schema);
            const sql_query             = connector.query_builder.generateUpdateQuery(v_data, this.schema);
            const { affected_rows = 0 } = await connector.executeQuery(sql_query, { transaction_id });

            this.emitHook("after_update", input_params, { affected_rows });
            return affected_rows;
        } 
        catch (error: unknown) { this.handleError("update", error); }
    }

    // Method to handle create a new record
    public static async increment(input_params: AdjustNumericColumnParams): Promise<number>  {
        try { return this.adjustNumericField("+", input_params); } 
        catch (error: unknown) { this.handleError("increment", error); }
    }

    // Method to handle create a new record
    public static async decrement(input_params: AdjustNumericColumnParams): Promise<number>  {
        try { return this.adjustNumericField("-", input_params); } 
        catch (error: unknown) { this.handleError("increment", error); }
    }

    // Method to handle create a new record
    public static async destroy(input_params: DestroyDataInputParams): Promise<number>  {
        try {
            const { v_state, v_msg, v_data } = ModelUtil.validateDestroyRequest(input_params, this.schema);

            if (!v_state || !v_data) { this.handleError("destroy", v_msg); }

            this.emitHook("before_destroy", v_data);

            const transaction_id        = v_data.transaction_id || "";
            const connector             = this.getSchemaConnector(this.schema);
            const sql_query             = connector.query_builder.generateDeleteQuery(v_data, this.schema);
            const { affected_rows = 0 } = await connector.executeQuery(sql_query, { transaction_id });

            this.emitHook("after_destroy", v_data, { affected_rows });
            return affected_rows;
        } 
        catch (error: unknown) { this.handleError("destroy", error); }
    }

}

export default BaseSQLModel;