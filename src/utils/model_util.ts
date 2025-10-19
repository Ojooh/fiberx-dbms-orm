
import { 
    SchemaDefinitionInterface,
    FindByPkInputParams,
    Permission,
    QueryBuilderObject,
    IncludeMeta,
    AssociationDefinition,
    InputParamsOptions,
    IncludeQuery,
    FindInputParams,
    CountInputParams,
    DataInputParams,
    SingleDataInputParams,
    DataQueryBuilderObject,
    UpdateDataInputParams,
    DestroyDataInputParams,
    ChangeDataQueryBuilderObject
} from "../types/model_type";

import GlobalVariableManagerUtil from "./global_variable_manager_util";


class ModelUtil {

    static global_vars          = GlobalVariableManagerUtil.getInstance();
    static valid_operators      = ["=", "!=", ">", ">=", "<", "<=", "in", "like", "is", "is_not"];
    static logical_ops          = ["and", "or"];

    private static isObject     = (obj: any): boolean => { return obj && typeof obj === "object" && !Array.isArray(obj); }

    private static validateCondition = (key: string, value: any, valid_columns: string[],  table_name: string = ""): boolean => {
        // Handle logical operators: and, or
        if (this.logical_ops.includes(key.toLowerCase())) {
            if (!Array.isArray(value)) return false;

            return value.every((cond: any) =>
                this.isObject(cond) && this.validateWhereObject(cond, valid_columns, table_name).v_state
            );
        }

        // Validate field name
        const column = this.resolveColumnName(key, table_name);

        if (!valid_columns.includes(column)) { return false; }

        // If value is object, validate operators
        if (this.isObject(value)) { return Object.keys(value).every(op => this.valid_operators.includes(op.toLowerCase())); }

        return true; // Direct equality check (e.g., { name: "John" })
    };
    
    // Method to handle error
    private static handleError(method: string, error: unknown): { v_state: boolean; v_msg: string } {
        const error_obj = error instanceof Error ? error : new Error(`Unknown error in method ${method}`);
        return { v_state: false, v_msg: `${error_obj.message}`}
    }

    // method to validate db permission
    private static isValidPermission (app_id: string, model_name: string, action: Permission, schema_permissions: Permission[] = [] ): { v_state: boolean; v_msg: string; }  { 
        const has_right     = schema_permissions.includes(action);
        const v_msg         = has_right ? "valid_permission" : `Permission denied: ${action} not allowed on model ${model_name} for app ${app_id}.`;

        return { v_state: has_right, v_msg }
    }

    // Method to resolve column name properly
    private static resolveColumnName(field: string, table_name: string): string {
        const [prefix, column] = field.split(".");
        return prefix === table_name ? column : field;
    }

    // Method to validate column field input
    private static validateFieldsInput(fields: string[], valid_columns: string[], table_name: string = ""): { v_state: boolean; v_msg: string; v_data?: string[] } {
        const resolved_fields = [];

        if (!Array.isArray(fields) || fields.some(f => typeof f !== "string")) {
            return { v_state: false, v_msg: `Invalid fields: must be an array of strings.` };
        }

        for (const field of fields) {
            const resolved = this.resolveColumnName(field, table_name!);

            if (!valid_columns.includes(resolved)) {
                return { v_state: false, v_msg: `Invalid field: "${field}" does not exist on table "${table_name}".`};
            }

            resolved_fields.push(`${resolved}`);
        }

        return { v_state: true, v_msg: "valid_columns", v_data: resolved_fields };

    }

    // Method to validate where object
    private static validateWhereObject(where: Record<string, any>,  valid_columns: string[],  table_name: string = "" ): { v_state: boolean; v_msg: string; v_data?: Record<string, any> } {
        if (!where || Object.keys(where).length === 0) {
            return { v_state: false, v_msg: `Unsafe update: WHERE clause is missing` };
        }

        if (!this.isObject(where)) {
            return { v_state: false, v_msg: `Invalid where clause: must be an object.` };
        }

        for (const [key, value] of Object.entries(where)) {
            const is_valid = this.validateCondition(key, value, valid_columns, table_name);

            if (!is_valid) { return { v_state: false, v_msg: `Invalid where condition at "${key}".` }; }
        }

        return { v_state: true, v_msg: "valid_where", v_data: where };
    }

    // Method to resolve association
    private static resolveAssociation(base_table_name: string, include_obj: IncludeMeta, associations: AssociationDefinition[]): AssociationDefinition | undefined {
        const { model: target, as: target_alias, where, fields,  required } = include_obj;

        return associations.find((obj) => {
            const { source, model, as: association_alias } = obj;
            const matches_alias     = target_alias && association_alias ? target_alias === association_alias : false;

            return (
                source?.schema?.table_name === base_table_name &&
                model?.schema?.table_name === target?.schema?.table_name &&
                matches_alias
            );
        });
    }

    // Method to validate  includes
    private static validateIncludes(associations: AssociationDefinition[], table_name: string, includes: IncludeMeta[] ): { v_state: boolean; v_msg: string; v_data?: IncludeQuery[] } {
        const includes_query_obj = [];

        for (const include_obj of includes) {

            const { fields = [], model, as = "", where = {}, includes: inner_includes = [], required = false, options  } = include_obj;

            const { table_name: target_table_name = "", columns = {} } = model?.schema;

            const valid_fields = Object.keys(columns);

            let target_fields;

            let nested_query_obj;

            if(fields) {
                const is_valid_fields = this.validateFieldsInput(fields, valid_fields, target_table_name);

                if(!is_valid_fields?.v_state) { return { v_state: false, v_msg: is_valid_fields?.v_msg} }

                target_fields = is_valid_fields?.v_data;
            }
            else { target_fields = valid_fields.map(col => `${table_name}.${col}`); }

            const association  = this.resolveAssociation(table_name, include_obj, associations);

            if(!association) { return {v_state: false, v_msg: `Invalid model in includes: ${include_obj} it has no association with table ${table_name}`}; }

            const { foreign_key, target_key, as: target_alias, type: association_type } = association;

            if (inner_includes.length) {
                const nested_result = this.validateIncludes(model?.associations || [], target_table_name, inner_includes);

                if (!nested_result?.v_state) { return nested_result; }

                nested_query_obj = nested_result?.v_data;
            }

            // Validate where clause if exists
            let validated_where = null;

            if (where && Object.entries(where).length) {
                const is_valid_where = this.validateWhereObject(where, valid_fields, target_table_name);

                if (!is_valid_where.v_state) { return { v_state: false, v_msg: is_valid_where.v_msg }; }

                validated_where = is_valid_where.v_data;
            }

            const query_obj = { 
                target_table_name, foreign_key, target_key, target_fields, target_alias, target_is_required: required,
                target_where: validated_where, association_type, includes: nested_query_obj
            }

            includes_query_obj.push(query_obj);
        }

        return { v_state: true, v_msg: "valid_includes", v_data: includes_query_obj };

    }

    // Method to validate options fields
    private static validateOptions(options: InputParamsOptions, valid_columns: string[], table_name: string = ""): { v_state: boolean; v_msg: string; v_data?: InputParamsOptions | {} } {
        const { limit = undefined, offset = undefined, order_by = "", order_direction, lock = "", transaction_id = "", distinct = false } = options;
        const v_data: Partial<InputParamsOptions> = {};

        // Validate order_by column
        if (order_by) {
            const column = this.resolveColumnName(order_by, table_name);
            if (!valid_columns.includes(column)) {
                return { v_state: false, v_msg: `Options value for Order By "${order_by}" is not valid. Must be a column in table "${table_name}".` };
            }
            v_data.order_by = column;
        }

        // Validate order direction
        if (order_direction) {
            const upper_direction = order_direction.toUpperCase();
            if (!["ASC", "DESC"].includes(upper_direction)) {
                return { v_state: false, v_msg: `Options value for Order Direction "${order_direction}" is not valid. Must be "ASC" or "DESC".` };
            }
            v_data.order_direction = upper_direction;
        }

        // Validate limit
        if (limit !== undefined) {
            if (typeof limit !== "number" || limit <= 0) {
                return { v_state: false, v_msg: `Options value for Limit "${limit}" is not valid. Must be a number greater than 0.` };
            }
            v_data.limit = limit;
        }

        // Validate offset
        if (offset !== undefined) {
            if (typeof offset !== "number" || offset < 0) {
                return { v_state: false, v_msg: `Options value for Offset "${offset}" is not valid. Must be a non-negative number.` };
            }
            v_data.offset = offset;
        }


        // Validate distinct (optional)
        if (typeof distinct === "boolean") {  v_data.distinct = distinct; }

        if (lock) { 
            const upper_lock = lock.toUpperCase();
            if (!["UPDATE", "SHARE"].includes(upper_lock)) {
                return { v_state: false, v_msg: `Options value for Lock "${upper_lock}" is not valid. Must be "UPDATE" or "SHARE".` };
            }
            v_data.lock = lock;
        }

        if (transaction_id && typeof transaction_id === "string") { v_data.transaction_id = transaction_id; }

        return { v_state: true, v_msg: "valid_options", v_data: v_data as InputParamsOptions };
    }

    // Method to validate record_data entries
    private static validateRecordDataArray(record_data: Record<string, any>[], valid_columns: string[], ignore_duplicates: boolean): { v_state: boolean; v_msg: string; v_data?: Record<string, any>[] } {
        if (!Array.isArray(record_data) || record_data.length === 0) {
            return { v_state: false, v_msg: `record_data must be a non-empty array of objects.` };
        }

        const validated_records = [];
        const seen              = new Set<string>();
        const reference_keys    = Object.keys(record_data[0]);

        for (let i = 0; i < record_data.length; i++) {
            const record = record_data[i];

            if (!this.isObject(record) || record === null || Array.isArray(record)) {
                return { v_state: false, v_msg: `Each record must be an object. Error at index ${i}.` };
            }

            const record_keys = Object.keys(record);

            const invalid_keys = Object.keys(record).filter(key => !valid_columns.includes(key));

            if (invalid_keys.length > 0) {
                return { v_state: false, v_msg: `Invalid field(s) in record at index ${i}: ${invalid_keys.join(", ")}` };
            }

            const missing_keys  = reference_keys.filter(key => !record_keys.includes(key));
            const extra_keys    = record_keys.filter(key => !reference_keys.includes(key));

            if (missing_keys.length > 0 || extra_keys.length > 0) {
                return { 
                    v_state: false, v_msg: `Field mismatch at index ${i}. Expected keys: [${reference_keys.join(", ")}], Found keys: [${record_keys.join(", ")}]`,
                };
            }

            const record_str = JSON.stringify(record);

            if (!ignore_duplicates) {
                if (seen.has(record_str)) {
                    return { v_state: false, v_msg: `Duplicate record found at index ${i}. To allow duplicates, set options.ignore_duplicates = true.`};
                }

                seen.add(record_str);
            }

            validated_records.push(record);
        }

        return { v_state: true, v_msg: "valid_record_data", v_data: validated_records };
    }

    // Method to validate find by pk request
    public static validateFindByPkRequest(input_params: FindByPkInputParams, schema: SchemaDefinitionInterface = {},  associations: AssociationDefinition[] = []): { v_state: boolean; v_msg: string, v_data?: QueryBuilderObject } {
        try {
            const app_id = this.global_vars.getVariable("APP_ID");

            const { table_name = "",  primary_key = "id", columns = {}, permissions, model_name = "" } = schema;

            const valid_columns = Object.keys(columns);

            const { id, fields, options = {} } = input_params;

            const { includes = [], transaction_id = "" } = options;

            let valid_fields;
            let valid_includes;
            let valid_options;

            // 1. Permission check
            const has_permission = this.isValidPermission(app_id, model_name, "read", permissions);

            if(!has_permission?.v_state) { return { v_state: false, v_msg: has_permission.v_msg} }

            // 2. Validate `id`
            if(!id) { return { v_state: false, v_msg: `Invalid Primary Key Value: ${id}`} }

            // 3. validate fields
            if(fields) {
                const is_valid_fields = this.validateFieldsInput(fields, valid_columns, table_name);

                if(!is_valid_fields?.v_state) { return { v_state: false, v_msg: is_valid_fields?.v_msg} }

                valid_fields = is_valid_fields?.v_data;
            }
            else { valid_fields = valid_columns.map(col => `${table_name}.${col}`); }

            // 4. Validate includes if present
            let includes_result;

            if (includes.length) {
                includes_result = this.validateIncludes(associations || [], table_name, includes);

                if (!includes_result?.v_state) { return { v_state: false, v_msg: includes_result?.v_msg}; }

                valid_includes = includes_result?.v_data;
            }

            // 4. Validate options
            let options_result;

            if (options && Object.keys(options).length > 1) {
                options_result = this.validateOptions(options, valid_columns, table_name);

                if (!options_result?.v_state) { return { v_state: false, v_msg: options_result?.v_msg}; }

                valid_options = options_result?.v_data || {};
            }
            else { valid_options = {}; }


            const where     = { [primary_key]: id };
            const v_data    = { fields: valid_fields, where, includes: valid_includes, transaction_id };

            return { v_state: true, v_msg: "valid_input", v_data: v_data as QueryBuilderObject }
        }
        catch (error: unknown) { return this.handleError("validateFindByPkRequest", error); }

    }

    // Method to validate find one request
    public static validateFindRequest(input_params: FindInputParams, schema: SchemaDefinitionInterface = {},  associations: AssociationDefinition[] = []): { v_state: boolean; v_msg: string, v_data?: QueryBuilderObject } {
        try {
            const app_id = this.global_vars.getVariable("APP_ID");

            const { table_name = "",  primary_key = "id", columns = {}, permissions, model_name = "" } = schema;

            const valid_columns = Object.keys(columns);

            const { fields, where, options = {} } = input_params;

            const { includes = [], transaction_id = "" } = options;

            let valid_fields;
            let validated_where = null;
            let valid_includes;
            let valid_options;

            // 1. Permission check
            const has_permission = this.isValidPermission(app_id, model_name, "read", permissions);

            if(!has_permission?.v_state) { return { v_state: false, v_msg: has_permission.v_msg} }

            // 2. validate fields
            if(fields) {
                const is_valid_fields = this.validateFieldsInput(fields, valid_columns, table_name);

                if(!is_valid_fields?.v_state) { return { v_state: false, v_msg: is_valid_fields?.v_msg} }

                valid_fields = is_valid_fields?.v_data;
            }
            else { valid_fields = valid_columns.map(col => `${table_name}.${col}`); }

            // 3. validate where
            if (where && Object.entries(where).length) {
                const is_valid_where = this.validateWhereObject(where, valid_columns, table_name);

                if (!is_valid_where.v_state) { return { v_state: false, v_msg: is_valid_where.v_msg }; }

                validated_where = is_valid_where.v_data;
            }

            // 4. Validate includes if present
            let includes_result;

            if (includes.length) {
                includes_result = this.validateIncludes(associations || [], table_name, includes);

                if (!includes_result?.v_state) { return { v_state: false, v_msg: includes_result?.v_msg}; }

                valid_includes = includes_result?.v_data;
            }

            // 4. Validate options
            let options_result;

            if (options && Object.keys(options).length > 1) {
                options_result = this.validateOptions(options, valid_columns, table_name);

                if (!options_result?.v_state) { return { v_state: false, v_msg: options_result?.v_msg}; }

                valid_options = options_result?.v_data || {};
            }
            else { valid_options = {}; }


            const v_data    = { ...valid_options, fields: valid_fields, where: validated_where, includes: valid_includes, transaction_id,  };

            return { v_state: true, v_msg: "valid_input", v_data: v_data as QueryBuilderObject }
        }
        catch (error: unknown) { return this.handleError("validateFindOneRequest", error); }

    }

    // Method to validate count request
    public static validateCountRequest(input_params: CountInputParams, schema: SchemaDefinitionInterface = {},  associations: AssociationDefinition[] = []): { v_state: boolean; v_msg: string, v_data?: QueryBuilderObject } {
        try {
            const app_id = this.global_vars.getVariable("APP_ID");

            const { table_name = "", columns = {}, permissions, model_name = "" } = schema;

            const valid_columns = Object.keys(columns);

            const { where, options = {} } = input_params;

            const { includes = [], transaction_id = "" } = options;

            let validated_where = null;
            let valid_includes;
            let valid_options;

            // 1. Permission check
            const has_permission = this.isValidPermission(app_id, model_name, "read", permissions);

            if(!has_permission?.v_state) { return { v_state: false, v_msg: has_permission.v_msg} }

            // 3. validate where
            if (where && Object.entries(where).length) {
                const is_valid_where = this.validateWhereObject(where, valid_columns, table_name);

                if (!is_valid_where.v_state) { return { v_state: false, v_msg: is_valid_where.v_msg }; }

                validated_where = is_valid_where.v_data;
            }

            // 4. Validate includes if present
            let includes_result;

            if (includes.length) {
                includes_result = this.validateIncludes(associations || [], table_name, includes);

                if (!includes_result?.v_state) { return { v_state: false, v_msg: includes_result?.v_msg}; }

                valid_includes = includes_result?.v_data;
            }

            // 4. Validate options
            let options_result;

            if (options && Object.keys(options).length > 1) {
                options_result = this.validateOptions(options, valid_columns, table_name);

                if (!options_result?.v_state) { return { v_state: false, v_msg: options_result?.v_msg}; }

                valid_options = options_result?.v_data || {};
            }
            else { valid_options = {}; }


            const v_data    = { ...valid_options, where: validated_where, includes: valid_includes, transaction_id,  };

            return { v_state: true, v_msg: "valid_input", v_data: v_data as QueryBuilderObject }
        }
        catch (error: unknown) { return this.handleError("validateCountRequest", error); }

    }

    // Method to validate create request
    public static validateCreateRequest(input_params: DataInputParams, schema: SchemaDefinitionInterface = {}): { v_state: boolean; v_msg: string, v_data?: DataQueryBuilderObject } {
        try {
            const app_id = this.global_vars.getVariable("APP_ID");

            const { table_name = "", columns = {}, permissions, model_name = "" } = schema;

            const valid_columns = Object.keys(columns);

            const { record_data = [], options = {} } = input_params;

            const { transaction_id = "", ignore_duplicates = false } = options;

            // 1. Permission check
            const has_permission = this.isValidPermission(app_id, model_name, "create", permissions);

            if(!has_permission?.v_state) { return { v_state: false, v_msg: has_permission.v_msg} }

            // 2. Validate record_data
            const records_result = this.validateRecordDataArray(record_data, valid_columns, ignore_duplicates);

            if (!records_result.v_state) {
                return { v_state: false, v_msg: records_result.v_msg };
            }

            // 3. Return validated data
            const v_data = { record_data: records_result.v_data, transaction_id, ignore_duplicates };

            return { v_state: true, v_msg: "valid_input", v_data: v_data as DataQueryBuilderObject }
        }
        catch (error: unknown) { return this.handleError("validateCountRequest", error); }

    }

    // Method to validate create request
    public static validateUpdateRequest(input_params: UpdateDataInputParams, schema: SchemaDefinitionInterface = {}): { v_state: boolean; v_msg: string, v_data?: ChangeDataQueryBuilderObject } {
        try {
            const app_id = this.global_vars.getVariable("APP_ID");

            const { table_name = "", columns = {}, permissions, model_name = "" } = schema;

            const valid_columns = Object.keys(columns);

            const { record_data = {}, where = {}, options = {} } = input_params;

            const { transaction_id = ""} = options;

            let validated_where = null;

            // 1. Permission check
            const has_permission = this.isValidPermission(app_id, model_name, "update", permissions);

            if(!has_permission?.v_state) { return { v_state: false, v_msg: has_permission.v_msg} }

            // 2. Validate record_data
            const records_result = this.validateRecordDataArray([record_data], valid_columns, false);

            if (!records_result.v_state) {
                return { v_state: false, v_msg: records_result.v_msg };
            }

            // 3. validate where
            const is_valid_where = this.validateWhereObject(where, valid_columns, table_name);

            if (!is_valid_where.v_state) { return { v_state: false, v_msg: is_valid_where.v_msg }; }

            validated_where = is_valid_where?.v_data;

            // 3. Return validated data
            const v_data = { record_data: records_result.v_data, where: validated_where,  transaction_id, };

            return { v_state: true, v_msg: "valid_input", v_data: v_data as ChangeDataQueryBuilderObject }
        }
        catch (error: unknown) { return this.handleError("validateUpdateRequest", error); }

    }

    // Method to validate destroy request
    public static validateDestroyRequest(input_params: DestroyDataInputParams, schema: SchemaDefinitionInterface = {}): { v_state: boolean; v_msg: string, v_data?: ChangeDataQueryBuilderObject } {
        try {
            const app_id = this.global_vars.getVariable("APP_ID");

            const { table_name = "", columns = {}, permissions, model_name = "" } = schema;

            const valid_columns = Object.keys(columns);

            const { where = {}, options = {} } = input_params;

            const { transaction_id = ""} = options;

            let validated_where = null;

            // 1. Permission check
            const has_permission = this.isValidPermission(app_id, model_name, "delete", permissions);

            if(!has_permission?.v_state) { return { v_state: false, v_msg: has_permission.v_msg} }

            // 2. validate where
            const is_valid_where = this.validateWhereObject(where, valid_columns, table_name);

            if (!is_valid_where.v_state) { return { v_state: false, v_msg: is_valid_where.v_msg }; }

            validated_where = is_valid_where?.v_data;

            // 3. Return validated data
            const v_data = { where: validated_where,  transaction_id, };

            return { v_state: true, v_msg: "valid_input", v_data: v_data as ChangeDataQueryBuilderObject }
        }
        catch (error: unknown) { return this.handleError("validateUpdateRequest", error); }

    }



}

export default ModelUtil;