import { ColumnType } from "../types/model_type";

class DataTypes {
    // Abstract base type
    static ABSTRACT(length: number = 255): ColumnType {
        return { name: "ABSTRACT", length };
    }

    // String types
    static STRING(length: number = 255): ColumnType {
        return { name: "STRING", length };
    }

    static CHAR(length: number = 1): ColumnType {
        return { name: "CHAR", length };
    }

    static TEXT(variant: "tiny" | "medium" | "long" = "medium"): ColumnType {
        return { name: "TEXT", variant };
    }

    // Number types
    static NUMBER(): ColumnType {
        return { name: "NUMBER" };
    }

    static TINYINT(): ColumnType {
        return { name: "TINYINT" };
    }

    static SMALLINT(): ColumnType {
        return { name: "SMALLINT" };
    }

    static MEDIUMINT(): ColumnType {
        return { name: "MEDIUMINT" };
    }

    static INTEGER(): ColumnType {
        return { name: "INTEGER" };
    }

    static BIGINT(): ColumnType {
        return { name: "BIGINT" };
    }

    static FLOAT(precision: number | null = null, scale: number | null = null): ColumnType {
        return { name: "FLOAT", precision, scale };
    }

    static DOUBLE(precision: number | null = null, scale: number | null = null): ColumnType {
        return { name: "DOUBLE", precision, scale };
    }

    static DOUBLE_PRECISION(): ColumnType {
        return { name: "DOUBLE_PRECISION" };
    }

    static DECIMAL(precision: number = 10, scale: number = 2): ColumnType {
        return { name: "DECIMAL", precision, scale };
    }

    static NUMERIC(precision: number = 10, scale: number = 2): ColumnType {
        return { name: "NUMERIC", precision, scale };
    }

    static REAL(): ColumnType {
        return { name: "REAL" };
    }

    // Date and time types
    static DATE(): ColumnType {
        return { name: "DATE" };
    }

    static DATEONLY(): ColumnType {
        return { name: "DATEONLY" };
    }

    static TIME(): ColumnType {
        return { name: "TIME" };
    }

    static NOW(): ColumnType {
        return { name: "NOW" };
    }

    // Boolean
    static BOOLEAN(): ColumnType {
        return { name: "BOOLEAN" };
    }

    // Binary/Blob
    static BLOB(variant: "tiny" | "medium" | "long" = "medium"): ColumnType {
        return { name: "BLOB", variant };
    }

    // UUID
    static UUID(): ColumnType {
        return { name: "UUID" };
    }

    static UUIDV1(): ColumnType {
        return { name: "UUIDV1" };
    }

    static UUIDV4(): ColumnType {
        return { name: "UUIDV4" };
    }

    // JSON
    static JSON(): ColumnType {
        return { name: "JSON" };
    }

    static JSONB(): ColumnType {
        return { name: "JSONB" };
    }

    // Arrays
    static ARRAY(type: ColumnType | null = null): ColumnType {
        return { name: "ARRAY", element_type: type };
    }

    // Enum
    static ENUM(...values: (string | number)[]): ColumnType {
        return { name: "ENUM", values };
    }

    // Special types
    static NONE(): ColumnType {
        return { name: "NONE" };
    }

    // Range
    static RANGE(sub_type: string | null = null): ColumnType {
        return { name: "RANGE", sub_type };
    }

    // Spatial
    static GEOMETRY(type: string | null = null, srid: number | null = null): ColumnType {
        return { name: "GEOMETRY", type, srid };
    }
}

export default DataTypes;