import LoggerUtil from "../utils/logger_util";
import BaseSQLConnector from "./connectors/base_sql_connector";
import DataSourceMapper from "./data_source_mapper";

import { 
    ConnectionParams, 
} from "../types/connector_type";

import { SQLDialect } from "../types/query_builder_type";


class DataSourceRegistry {
    private static instance: DataSourceRegistry;
    private readonly registry: Map<string, { connector: BaseSQLConnector, dialect: SQLDialect }>;
    private readonly module_name: string;
    private readonly logger: LoggerUtil;

    private constructor(logger?: LoggerUtil) {
        this.module_name    = "data_source_registry";
        this.registry       = new Map();
        this.logger         = logger ?? new LoggerUtil(this.module_name, true);
    }

    // Method to handle error
    private handleError(method: string, error: unknown): never {
        const error_obj = error instanceof Error ? error : new Error(`Unknown error in method ${method}`);
        this.logger.error(`[${this.module_name}] Error in ${method}: ${error_obj.message}`, { error_obj });
        throw error_obj
    }

    // ✅ Singleton accessor
    public static getInstance(logger?: LoggerUtil): DataSourceRegistry {
        if (!DataSourceRegistry.instance) {
            DataSourceRegistry.instance = new DataSourceRegistry(logger);
        }
        return DataSourceRegistry.instance;
    }

    // Method to Register a connector
    public async registerConnector( name: string, dialect: SQLDialect, connection_params: ConnectionParams ): Promise<BaseSQLConnector> {
        try {
            if (this.registry.has(name)) { this.handleError("registerConnector", `Connector name "${name}" is already registered.`); }

            const connector_instance = DataSourceMapper.getDataSource(dialect, this.logger);

            if (!connector_instance) { this.handleError("registerConnector", `Unsupported dialect: "${dialect}"`); }

            await connector_instance.connect(connection_params);

            this.registry.set(name, { connector: connector_instance, dialect });

            this.logger.success(`[${this.module_name}] Registered connector "${name}" using dialect "${dialect}"`);
            return connector_instance;
        }
        catch (error: unknown) { this.handleError("registerConnector", error); }
        

       
    }

    // Method to Get a registered connector
    public getConnector(name: string): BaseSQLConnector {
        const entry = this.registry.get(name);

        if (!entry) { this.handleError("getConnector", `No connector found with name "${name}"`); }

        return entry.connector;
    }

    // ✅ List all registered connectors
    public listConnectors(filter_dialect?: SQLDialect): Record<string, string> {
        const result: Record<string, string> = {};

        for (const [name, { connector, dialect }] of this.registry.entries()) {
            if (!filter_dialect || dialect === filter_dialect) {
                result[name] = connector.constructor.name;
            }
        }

        return result;
    }
}

export default DataSourceRegistry;
