const BaseModel         = require("./base_model");

const BaseModelUtil     = require("../util/base_model_util");
const LoggerUtil        = require("../../utils/logger_util");

class NoSQLBaseModel extends BaseModel {
    // Default static properties (can be overridden by subclasses)
    static schema               = {};
    static associations         = [];
    static _model_util          = null;
    static _logger              = null;
    
    // Dynamically instantiate BaseModelUtil with schema + associations
    static get logger() {
        if (!this._logger) {
            this._logger = new LoggerUtil(this.name || "no_sql_base_model");
        }
        return this._logger;
    }

    static get model_util () {
        if (!this._model_util) {
            this._model_util = new BaseModelUtil(this.schema, this.associations, this.logger);
        }
        return this._model_util;
    }
}

module.exports = NoSQLBaseModel;