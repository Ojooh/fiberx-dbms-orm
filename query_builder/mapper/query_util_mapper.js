const QueryUtilMapper = (dialect, logger) =>  {
    if(!dialect) {
        logger.error(`Unsupported dialect: ${dialect}`);
        throw new Error(`Unsupported dialect: ${dialect}`);
    }

    switch (dialect.toLowerCase()) { 
        case "mysql":
            return require("../query_util/mysql_query_util")
        case "postgres":
            return require("../query_util/postgres_query_util")
        default:
            logger.error(`❌  Unsupported dialect: ${name}`);
            throw new Error(`❌  Unsupported dialect: ${name}`);

    }
}

module.exports = QueryUtilMapper;