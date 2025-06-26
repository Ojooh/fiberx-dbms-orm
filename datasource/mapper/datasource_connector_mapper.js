const DataourceConnectorMapper = {
    "mysql": require("../connectors/mysql_datasource_connector"),
    "postgres": require("../connectors/postgres_datasource_connector")
}

module.exports = DataourceConnectorMapper;