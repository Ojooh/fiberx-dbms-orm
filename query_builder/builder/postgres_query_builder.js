const BaseQueryBuilder  = require("./base_query_builder")

class PostgresQueryBuilder extends BaseQueryBuilder {
    constructor(schema = {}, associations = [], logger = null) {
        super("postgres", schema, associations, logger);
        this.name = "postgres_query_builder";
    }
}

module.exports = PostgresQueryBuilder;
