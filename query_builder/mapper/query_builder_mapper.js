const QueryBuilderMapper = (dialect, logger) =>  {
    if(!dialect) {
        logger.error(`Unsupported dialect: ${dialect}`);
        throw new Error(`Unsupported dialect: ${dialect}`);
    }

    switch (dialect.toLowerCase()) { 
        case "mysql":
            return require("../builder/mysql_query_builder")
        case "postgres":
            return require("../builder/postgres_query_builder")
        default:
            logger.error(`❌  Unsupported dialect: ${name}`);
            throw new Error(`❌  Unsupported dialect: ${name}`);

    }
}

module.exports = QueryBuilderMapper;