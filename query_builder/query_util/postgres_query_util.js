const BaseQueryUtil             = require("./base_query_uitl");
const PostgresDatatypeMapper    = require("../../datatype/mapper/postgres_datatype_mapper");

class PostgresQueryUtil extends BaseQueryUtil {
    constructor(schema = {}, associations = [], logger = null) {
        super("postgres", schema, associations, logger);

        this.name               = "postgres_query_util";
        this.like_op            = "ILIKE";
        this.data_typer_mapper  = new PostgresDatatypeMapper(logger);
    }

}

module.exports = PostgresQueryUtil