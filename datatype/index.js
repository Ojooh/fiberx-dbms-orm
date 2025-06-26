class DataTypes {
    // Abstract base type
    ABSTRACT = (length = 255) => ({ name: "ABSTRACT", length });

    // String types
    STRING = (length = 255) => ({ name: "STRING", length });

    CHAR = (length = 1) => ({ name: "CHAR", length });

    TEXT = (variant = 'medium') => {
        const variants = ["tiny", "medium", "long"];
        return { name: "TEXT", variant: variants.includes(variant) ? variant : "medium" };
    };

    // Number types
    NUMBER = () => ({ name: "NUMBER" });

    TINYINT = () => ({ name: "TINYINT" });

    SMALLINT = () => ({ name: "SMALLINT" });

    MEDIUMINT = () => ({ name: "MEDIUMINT" });

    INTEGER = () => ({ name: "INTEGER" });

    BIGINT = () => ({ name: "BIGINT" });

    FLOAT = (precision = null, scale = null) => ({ name: "FLOAT", precision, scale });

    DOUBLE = (precision = null, scale = null) => ({ name: "DOUBLE", precision, scale });

    DOUBLE_PRECISION = () => ({ name: "DOUBLE_PRECISION" });

    DECIMAL = (precision = 10, scale = 2) => ({ name: "DECIMAL", precision, scale });

    NUMERIC = (precision = 10, scale = 2) => ({ name: "NUMERIC", precision, scale });

    REAL = () => ({ name: "REAL" });

    // Date and time types
    DATE = () => ({ name: "DATE" });

    DATEONLY = () => ({ name: "DATEONLY" });

    TIME = () => ({ name: "TIME" });

    NOW = () => ({ name: "NOW" });


    // Boolean
    BOOLEAN = () => ({ name: "BOOLEAN" });


    // Binary/Blob
    BLOB = (variant = "medium") => {
        const variants = ["tiny", "medium", "long"];
        return { name: "BLOB", variant: variants.includes(variant) ? variant : "medium" };
    };

    // UUID types
    UUID = () => ({ name: "UUID" });

    UUIDV1 = () => ({ name: "UUIDV1" });

    UUIDV4 = () => ({ name: "UUIDV4" });

    // JSON
    JSON = () => ({ name: "JSON" });
    
    JSONB = () => ({ name: "JSONB" });

    // Arrays
    ARRAY = (type = null) => ({ name: "ARRAY", element_type: type });

    // Special
    NONE = () => ({ name: "NONE" });

    // Enum
    ENUM = (...values) => ({ name: "ENUM", values });

    // Range
    RANGE = (sub_type = null) => ({ name: "RANGE", sub_type });

    // Spatial
    GEOMETRY = (type = null, srid = null) => ({ name: "GEOMETRY", type, srid });
}

module.exports = new DataTypes();
