import { SQLDialect } from "../types/query_builder_type";
import LoggerUtil from "../utils/logger_util";

import BaseDataTypeMapper from "./base_data_type_mapper";
import MySQLDataMapper from "./implementations/mysql_data_type";
import PostgresDataMapper from "./implementations/postgres_data_type";


class DataTypeMapper {
    // Method to get query builder based on dialect
    public static getDialectDataMapper(dialect: SQLDialect, logger?: LoggerUtil): BaseDataTypeMapper {
        switch (dialect) {
            case "mysql":
                return new MySQLDataMapper(logger);
            case "postgres":
                return new PostgresDataMapper(logger);
            default:
                throw new Error(`Unsupported SQL dialect: ${dialect}`);
        }
    }
}

export default DataTypeMapper;
