const BaseModelUtil     = require("../util/base_model_util");
const LoggerUtil        = require("../../utils/logger_util");

class BaseModel {
    // Default static properties (can be overridden by subclasses)
    static schema               = {};
    static associations         = [];
    static _model_util          = null;
    static logger               = new LoggerUtil("base_model");
    
    // Dynamically instantiate BaseModelUtil with schema + associations
    static get model_util () {
        if (!this._model_util) {
            this._model_util = new BaseModelUtil(this.schema, this.associations, this.logger);
        }
        return this._model_util;
    }

    static async findByPk (id, fields = [], options = {}) { throw new Error("Not implemented"); }

    static async findOne (fields, where, options = {}) {  throw new Error("Not implemented"); }

    static async findAll (fields, where, options = {}) { throw new Error("Not implemented"); }

    static async count (where, options = {}) { throw new Error("Not implemented"); }

    static async findAndCountAll (fields, where, options = {}) { throw new Error("Not implemented"); }

    static async create (data, options = {}) { throw new Error("Not implemented"); }

    static async bulkCreate (data, options = {}) { throw new Error("Not implemented"); }
    
    static  async update (data, where, options = {}) { throw new Error("Not implemented"); }

    static  async increment (field, where = null, amount = 1, options = {}) { throw new Error("Not implemented"); }

    static  async decrement (field, where = null, amount = 1, options = {}) { throw new Error("Not implemented"); }

     static async destroy (where, options = {}) { throw new Error("Not implemented"); }

    constructor(data = {}) {
        Object.assign(this, data); // Assign data to instance properties
    }
}

module.exports = BaseModel;
