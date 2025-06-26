// app.js (fiberx entry point)

// === DataTypes for Schema Definitions ===
const DataTypes                 = require('./datatype');

// === Core DataSource Management ===
const DataSourceRegistry        = require('./datasource/registry/datasource_registry');
const DataSourceConnectorMapper = require('./datasource/mapper/datasource_connector_mapper');


// === Base Models ===
const SQLBaseModel              = require('./model/base/sql_base_model');
const NoSQLBaseModel            = require('./model/base/nosql_base_model');
const BaseModelMapper           = require('./model/mapper/base_model_mapper');

// === Query Builders ===
const BaseQueryBuilder          = require('./query_builder/builder/base_query_builder');
const QueryBuilderMapper        = require('./query_builder/mapper/query_builder_mapper');
const QueryUtilMapper           = require('./query_builder/mapper/query_util_mapper');

// === Utilities ===
const LoggerUtil                = require('./utils/logger_util');
const EventSystemUtil           = require('./utils/event_system_util');
const GlobalVariableManager     = require('./utils/global_variable_manager');

// === Fiberx Main Interface ===
const Fiberx = {
  DataSourceRegistry,
  DataSourceConnectorMapper,
  DataTypes,
  SQLBaseModel,
  NoSQLBaseModel,
  BaseModelMapper,
  BaseQueryBuilder,
  QueryBuilderMapper,
  QueryUtilMapper,
  LoggerUtil,
  EventSystemUtil,
  GlobalVariableManager,
};

module.exports = Fiberx;

// Also expose individual components for selective import
module.exports.Fiberx = Fiberx;
module.exports.DataTypes = DataTypes;
module.exports.SQLBaseModel = SQLBaseModel;
module.exports.NoSQLBaseModel = NoSQLBaseModel;
module.exports.BaseModelMapper = BaseModelMapper;
