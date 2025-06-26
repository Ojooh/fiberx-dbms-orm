const BaseQueryUtil         = require("./base_query_uitl");
const MysqlDatatypeMapper    = require("../../datatype/mapper/mysql_datatype_mapper");

class MYSQLQueryUtil extends BaseQueryUtil {
    constructor(schema = {}, associations = [], logger = null) {
        super("mysql", schema, associations, logger);

        this.name               = "mysql_query_util";
        this.like_op            = "LIKE";
        this.data_typer_mapper  = new MysqlDatatypeMapper(logger);
    }

}

module.exports = MYSQLQueryUtil