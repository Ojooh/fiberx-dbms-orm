import { SQLDialect } from "../types/query_builder_type";

import BaseSQLQueryBuilder from "./base_sql_query_builder";
import MySQLQueryBuilder from "./implementations/mysql_query_builder";


class QueryBuilderMapper {
    // Method to get query builder based on dialect
    public static getQueryBuilder(dialect: SQLDialect): BaseSQLQueryBuilder {
        switch (dialect) {
            case "mysql":
                return new MySQLQueryBuilder();
            default:
                throw new Error(`Unsupported SQL dialect: ${dialect}`);
        }
    }
}

export default QueryBuilderMapper;
