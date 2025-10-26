// === DataTypes for Schema Definitions ===
import DataTypes from "./data_type/base_data_type";

// === Core DataSource Management ===
import DataSourceRegistry from "./data_sources/data_source_registry";

// === Base Models ===
import BaseSQLModel from "./base_models/base_sql_model";


// === Utilities ===
import LoggerUtil from "./utils/logger_util";
import EventSystemUtil from "./utils/event_system_util";
import GlobalVariableManager from "./utils/global_variable_manager_util";
import QueryCacheManagerUtil from "./utils/query_cache_manager_util"; 

// === Scripts ===
import ModelGenerator from "./generators/model_generator";
import MigrationGenerator from "./generators/migration_generator";
import SeederGenerator from "./generators/seeder_generator";
import FiberXBootstrapClient from "./scripts/fiberx_bootstrap_client";

// === Types ===
import BaseSQLConnector from "./data_sources/connectors/base_sql_connector";
import SQLQueryBuilder from "./query_builders/base_sql_query_builder";

// === Initialize Query Cache Manager ===
const QUERY_CACHE_ENABLED   = process.env.FIBERX_QUERY_CACHE_ENABLED !== "false"; // default ON
const CACHE_TTL_MS          = Number(process.env.FIBERX_QUERY_CACHE_TTL_MS) || 1000 * 60 * 60 * 12; // 12h
const CACHE_MAX_ENTRIES     = Number(process.env.FIBERX_QUERY_CACHE_MAX_ENTRIES) || 1000;

QueryCacheManagerUtil.initialize({
  enabled: QUERY_CACHE_ENABLED,
  ttl_ms: CACHE_TTL_MS,
  max_entries: CACHE_MAX_ENTRIES
});

console.log(`[FiberX] QueryCacheManager initialized (enabled=${QUERY_CACHE_ENABLED})`);

// === Fiberx Main Interface ===
const Fiberx = {
  DataTypes,
  DataSourceRegistry,

  BaseSQLModel,

  LoggerUtil,
  EventSystemUtil,
  GlobalVariableManager,

  ModelGenerator,
  MigrationGenerator,
  SeederGenerator,
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
  EventSystemUtil,
  GlobalVariableManager,

  ModelGenerator,
  MigrationGenerator,
  SeederGenerator,
  FiberXBootstrapClient
};