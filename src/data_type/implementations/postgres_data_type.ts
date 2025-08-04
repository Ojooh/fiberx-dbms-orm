
import {  ColumnType } from "../../types/model_type";

import BaseDataTypeMapper from "../base_data_type_mapper";
import LoggerUtil from "../../utils/logger_util";


class PostgresDataMapper implements BaseDataTypeMapper {
    private readonly module_name: string;
    private logger: LoggerUtil;
    
    constructor(logger?: LoggerUtil) {
        this.module_name    = "postgres_data_mapper";
        this.logger         = logger ?? new LoggerUtil(this.module_name, true);
    }

    public mapDataType(column_definition: ColumnType): string {
        if (!column_definition || !column_definition?.name) {
            throw new Error("Invalid data type object provided for Postgres mapping");
        }

        const { name, length, precision, scale, variant, values, element_type, sub_type } = column_definition;

        switch (name.toUpperCase()) {
            // String types
            case "STRING":
                return `VARCHAR(${length || 255})`;

            case "CHAR":
                return `CHAR(${length || 1})`;

            case "TEXT":
                return "TEXT"; // PostgreSQL uses TEXT regardless of variant

            // Number types
            case "NUMBER":
            case "INTEGER":
                return "INTEGER";

            case "INTEGER_PRIMARY_KEY":
                return "SERIAL";

            case "TINYINT":
            case "SMALLINT":
                return "SMALLINT";

            case "MEDIUMINT":
                return "INTEGER"; // PG does not have mediumint

            case "BIGINT":
                return "BIGINT";

            case "BIGINT_PRIMARY_KEY":
                return "BIGSERIAL";

            case "FLOAT":
                return (precision && scale) ? `FLOAT(${precision}, ${scale})` : "REAL";

            case "DOUBLE":
            case "DOUBLE_PRECISION":
                return "DOUBLE PRECISION";

            case "DECIMAL":
            case "NUMERIC":
                return (precision && scale) ? `NUMERIC(${precision}, ${scale})` : "NUMERIC(10,2)";

            case "REAL":
                return "REAL";

            // Date & Time
            case "DATE":
            case "DATETIME":
                return "TIMESTAMP";

            case "DATEONLY":
                return "DATE";

            case "TIME":
                return "TIME";

            case "NOW":
                return "CURRENT_TIMESTAMP";

            // Boolean
            case "BOOLEAN":
                return "BOOLEAN";

            // Binary / Blob
            case "BLOB":
                return "BYTEA";

            // UUID
            case "UUID":
            case "UUIDV1":
            case "UUIDV4":
                return "UUID";

            // JSON
            case "JSON":
                return "JSON";

            case "JSONB":
                return "JSONB";

            // Array
            case "ARRAY":
                if (element_type && element_type.name) {
                    const inner_type = this.mapDataType(element_type);
                    return `${inner_type}[]`;
                }
                return "TEXT[]"; // default fallback

            // Enum
            case "ENUM":
                if (Array.isArray(values) && values.length > 0) {
                    const val_str = values.map(v => `'${v}'`).join(', ');
                    return `ENUM(${val_str})`; // Note: Requires external type creation
                }
                throw new Error(`[${this.module_name}] ENUM type must have a non-empty values array`);

            // Range types (native to PG)
            case "RANGE":
                if (sub_type && sub_type.toLowerCase() === "int"){  return "INT4RANGE"; }
                if (sub_type && sub_type.toLowerCase() === "bigint"){  return "INT8RANGE"; }
                if (sub_type && sub_type.toLowerCase() === "numeric"){  return "NUMRANGE"; }
                if (sub_type && sub_type.toLowerCase() === "timestamp"){  return "TSRANGE"; }
                if (sub_type && sub_type.toLowerCase() === "timestamptz"){  return "TSTZRANGE"; }
                
                return "NUMRANGE";

            // Geometry (requires PostGIS)
            case "GEOMETRY":
                return "GEOMETRY"; // Requires PostGIS extension

            // Fallback
            case "NONE":
            case "ABSTRACT":
                return "TEXT";

            default:
                throw new Error(`❌ [${this.module_name}] Unsupported data type for PostgreSQL: ${name}`);
        }
    }

}

export default PostgresDataMapper;