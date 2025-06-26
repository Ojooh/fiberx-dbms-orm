const BaseModelMapper = (datasource_type, logger = console) =>  {
    if(!datasource_type) {
        logger.error(`Unsupported datasource_type: ${datasource_type}`);
        throw new Error(`Unsupported datasource_type: ${datasource_type}`);
    }

    switch (datasource_type.toLowerCase()) { 
        case "mysql":
        case "postgres":
            return require("../base/sql_base_model");
        default:
            logger.error(`❌  Unsupported datasource_type: ${name}`);
            throw new Error(`❌  Unsupported datasource_type: ${name}`);

    }
}

module.exports = BaseModelMapper;