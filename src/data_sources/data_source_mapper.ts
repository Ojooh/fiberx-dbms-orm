import { SQLDialect } from "../types/query_builder_type";

import BaseSQLConnector from "./connectors/base_sql_connector";
import MySQLConnector from "./connectors/implementations/mysql_connector";
import PostgresConnector from "./connectors/implementations/postgres_connector";

import LoggerUtil from "../utils/logger_util";


class DataSourceMapper {
    // Method to get query builder based on dialect
    public static getDataSource(dialect: SQLDialect, logger?: LoggerUtil): BaseSQLConnector {
        switch (dialect) {
            case "mysql":
                return new MySQLConnector(logger);
            case "postgres":
                return new PostgresConnector(logger);
            default:
                throw new Error(`Unsupported SQL dialect: ${dialect}`);
        }
    }
}

export default DataSourceMapper;
