const BaseQueryBuilder  = require("./base_query_builder")

class MYSQLQueryBuilder extends BaseQueryBuilder {
    constructor(schema = {}, associations = [], logger = null) {
        super("mysql", schema, associations, logger);
        this.name = "mysql_query_builder";
    }
}

module.exports = MYSQLQueryBuilder;
