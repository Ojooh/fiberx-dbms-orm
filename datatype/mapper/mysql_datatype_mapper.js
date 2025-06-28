const LoggerUtil                = require("../../utils/logger_util");

class MysqlDatatypeMapper {
    constructor(logger = null) {
        this.name           = "mysql_datatype_mapper";
        this.logger        = logger || new LoggerUtil(this.name);
    }

    mapDataType = (type_def_obj) => {
        if (!type_def_obj || !type_def_obj.name) {
            const msg = `❌ [${this.name}] Invalid data type object provided for MySQL mapping`;
            this.logger.error(msg)
            throw new Error(msg);
        }

        const { name, length, precision, scale, variant, values, element_type, sub_type } = type_def_obj;

        switch (name.toUpperCase()) {
            // String types
            case "STRING":
                return `VARCHAR(${length || 255})`;

            case "CHAR":
                return `CHAR(${length || 1})`;

            case "TEXT":
                switch (variant) {
                    case "tiny": return "TINYTEXT";
                    case "medium": return "MEDIUMTEXT";
                    case "long": return "LONGTEXT";
                    default: return "TEXT";
                }

            // Number types
            case "NUMBER":
            case "INTEGER":
                return type_def_obj.unsigned ? "INT UNSIGNED" : "INT";

            case "INTEGER_PRIMARY_KEY":
                return type_def_obj.unsigned ? "INT UNSIGNED AUTO_INCREMENT" : "INT AUTO_INCREMENT";

            case "TINYINT":
                return "TINYINT";

            case "SMALLINT":
                return "SMALLINT";

            case "MEDIUMINT":
                return "MEDIUMINT";

            case "BIGINT":
                return "BIGINT";

            case "BIGINT_PRIMARY_KEY":
                return "BIGINT AUTO_INCREMENT";

            case "FLOAT":
                return (precision && scale) ? `FLOAT(${precision}, ${scale})` : "FLOAT";

            case "DOUBLE":
                return (precision && scale) ? `DOUBLE(${precision}, ${scale})` : "DOUBLE";

            case "DOUBLE_PRECISION":
                return "DOUBLE PRECISION";

            case "DECIMAL":
            case "NUMERIC":
                return (precision && scale) ? `DECIMAL(${precision}, ${scale})` : "DECIMAL(10,2)";

            case "REAL":
                return "REAL";

            // Date & Time
            case "DATE":
            case "DATETIME":
                return "DATETIME";

            case "DATEONLY":
                return "DATE";

            case "TIME":
                return "TIME";

            case "NOW":
                return "CURRENT_TIMESTAMP";

            // Boolean
            case "BOOLEAN":
                return "TINYINT(1)";

            // Binary / Blob
            case "BLOB":
                switch (variant) {
                    case "tiny": return "TINYBLOB";
                    case "medium": return "MEDIUMBLOB";
                    case "long": return "LONGBLOB";
                    default: return "BLOB";
                }

            // UUID
            case "UUID":
            case "UUIDV1":
            case "UUIDV4":
                return "CHAR(36)";

            // JSON
            case "JSON":
            case "JSONB":
                return "JSON";

            // Array (unsupported natively in MySQL)
            case "ARRAY":
                this.logger.warn(`⚠️ [${this.name}] '${name}' is not natively supported in MySQL. Using fallback: JSON`);
                return "JSON"; // fallback for array

            // Enum
            case "ENUM":
                if (Array.isArray(values) && values.length > 0) {
                    const val_str = values.map(v => `'${String(v).toUpperCase()}'`).join(', ');
                    return `ENUM(${val_str})`;
                }
                throw new Error("ENUM type must have values array");

            // Range (unsupported natively in MySQL)
            case "RANGE":
                this.logger.warn(`⚠️ [${this.name}] '${name}' is not natively supported in MySQL. Using fallback: JSON`);
                return "JSON"; // fallback

            // Geometry (partial MySQL support)
            case "GEOMETRY":
                return "GEOMETRY";

            // Fallback
            case "NONE":
            case "ABSTRACT":
                this.logger.warn(`⚠️ [${this.name}] '${name}' is not natively supported in MySQL. Using fallback: TEXT`);
                return "TEXT";

            default:
                throw new Error(`❌  [${this.name}] Unsupported data type for MySQL: ${name}`);
        }

    };
}

module.exports = MysqlDatatypeMapper;
