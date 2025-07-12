const DataourceConnectorMapper = require("../mapper/datasource_connector_mapper");
const LoggerUtil                = require("../../utils/logger_util");
const GlobalVariableManager     = require("../../utils/global_variable_manager");


class DatasourceRegistry {
    // Singleton accessor
    static getInstance = (logger = null) => {
        if (!DatasourceRegistry.instance) {
            DatasourceRegistry.instance = new DatasourceRegistry(logger);
        }
        
        return DatasourceRegistry.instance;
    }

    // constructor method
    constructor(logger = null) {
        this.name           = "datasource_registry"
        this.registry       = new Map();
        this.logger         = logger || new LoggerUtil(this.name);
        this.mapper         = DataourceConnectorMapper || {};
        this.global_vars    = GlobalVariableManager.getInstance();
    }

    // Method to get a connector for a data source
    getDataSource = (name) => {
        const connector = this.registry.get(name);

        if (!connector) { 
            const msg = `❌ [${this.name}] No connector registered under name "${name}"`;
            this.logger.error(msg);
            throw new Error(msg); 
        }
        return connector;
    }   

    // Method to list registered data source connectors
    listRegisteredDataSources = () => {
        const obj = {};
        for (const [key, value] of this.registry.entries()) { obj[key] = value; }
        return obj;
    }

    // Method to initialize a connector given name and connetion options
    initializeConnector = async (name, datasource_type, connection_options, app_config = {}) => {
        try {
            const { MODE = "development", APP_ID = "" } = app_config;

            this.global_vars.setVariable("ENV", app_config);

            this.logger.info(`[${this.name}] Registering connection for app ${APP_ID} in ${MODE} mode`);

            const connector = this.mapper[datasource_type] ? new this.mapper[datasource_type](connection_options, this.logger) : null;

            if(!name) {
                const msg = `❌  [${this.name}] Unsupported name input: ${name}`;
                this.logger.error(msg);
                throw new Error(msg);
            }

            if(!connector) {
                const msg = `❌  [${this.name}] Unsupported datasource type: ${datasource_type}`;
                this.logger.error(msg);
                throw new Error(msg);
            }

            await connector.connect();
            this.#registerConnector(name, connector);
            return connector;
        }
        catch (error) {
            const msg = `❌ [${this.name}] Failed to initialize connector: "${connector_name}"`;
            this.logger.error(msg, { error });
            throw error;
        }
    }

    // Private MEthod to register a datasource connection
    #registerConnector = (name, connector) => { return this.registry.set(name, connector); }

}

module.exports = DatasourceRegistry