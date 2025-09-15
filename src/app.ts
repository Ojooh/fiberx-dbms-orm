// === DataTypes for Schema Definitions ===
import DataTypes from "./data_type/base_data_type";

// === Core DataSource Management ===
import DataSourceRegistry from "./data_sources/data_source_registry";

// === Base Models ===
import BaseSQLModel from "./base_models/base_sql_model";


// === Utilities ===
import LoggerUtil from "./utils/logger_util";
import GlobalVariableManager from "./utils/global_variable_manager_util";

// === Scripts ===
import ModelGenerator from "./generators/model_generator";
import FiberXBootstrapClient from "./scripts/fiberx_bootstrap_client";

// === Types ===
import BaseSQLConnector from "./data_sources/connectors/base_sql_connector";
import SQLQueryBuilder from "./query_builders/base_sql_query_builder";

// === Fiberx Main Interface ===
const Fiberx = {
  DataTypes,
  DataSourceRegistry,

  BaseSQLModel,

  LoggerUtil,
  GlobalVariableManager,

  ModelGenerator,
  FiberXBootstrapClient
};

// === Export Default Fiberx (for destructure or global usage) ===
export default Fiberx;

// === Also export individual modules for tree-shaking or selective imports ===
export {
  DataTypes,
  DataSourceRegistry,

  BaseSQLModel,
  BaseSQLConnector,
  SQLQueryBuilder,

  LoggerUtil,
  GlobalVariableManager,

  ModelGenerator,
  FiberXBootstrapClient
};