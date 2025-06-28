
const modelCodeContent = (class_name) => {
    return`
const { SQLBaseModel: BaseModel }   = require("fiberx-dbms-orm");
const { ${class_name}Schema }       = require("../schemas/app_schemas");

class ${class_name}Model extends BaseModel {
    // Define your schema here
    static schema = ${class_name}Schema;

    #raw;

    constructor(data = {}) {
        super(data);
        this.#raw = data;
        this.addComputedAttributes();
    }

    // Method to get app computed attributes object
    getComputedAttributes = () => { return {}; };

    // Method to add computed attributes to the model
    addComputedAttributes = () => {
        const computed_attributes = this.getComputedAttributes();
        for (const [key, value] of Object.entries(computed_attributes)) {
            this[key] = value;
        }
    };
}

module.exports = ${class_name}Model;
`;
} 

const initialMigrationContent = (model_name, column_names, index_names) => {
    return `
const { QueryBuilderMapper } = require("fiberx-dbms-orm");
const { ${model_name}Schema }    = require("../../schemas/app_schemas");

class ${model_name}InitialMigration {
    constructor(database_manager, logger = null) {
        this.datbase_manager    = database_manager;
        this.logger             = logger
        this.metadata = {
            columns: ${JSON.stringify(column_names)},
            indexes: ${JSON.stringify(index_names)},
            timestamp: "${new Date().toISOString()}",
            schema_name: ${model_name}Schema?.name,
        };

        this.connector          = this.datbase_manager.getRegistredDataSource(${model_name}Schema?.datasource_name);
        this.QueryBuilderClass  = QueryBuilderMapper(${model_name}Schema?.datasource_type, this.logger);
        this.query_builder      = new this.QueryBuilderClass(${model_name}Schema, [], this.logger);
    }

    up = async () => {
        const { create_sql, trigger_sqls }  = this.query_builder.createTable();

        await this.connector.executeQuery(create_sql);

        if (trigger_sqls && Array.isArray(trigger_sqls)) {
            for (const trigger_sql of trigger_sqls) {
                await this.connector.executeQuery(trigger_sql);
            }
        }

        const indexes = ${model_name}Schema.indexes;

        for (const index_obj of indexes) {
            const create_index_query = this.query_builder.createIndex(index_obj.fields, index_obj?.unique);
            await this.connector.executeQuery(create_index_query);
        }
    }

    down = async () => {
        const query = this.query_builder.dropTable();
        await this.connector.executeQuery(query);
    }
}

module.exports = ${model_name}InitialMigration;
    
`
}

const deltaMigrationContent = (model_name, added_cols, added_indx, removed_cols, removed_indx) => {
    return `
const { QueryBuilderMapper } = require("fiberx-dbms-orm");
const { ${model_name}Schema }    = require("../../schemas/app_schemas");

class ${model_name}DeltaMigration {
    constructor(database_manager, logger = null) {
        this.datbase_manager    = database_manager;
        this.logger             = logger
        this.metadata = {
            columns: ${JSON.stringify(added_cols)},
            indexes: ${JSON.stringify(added_indx)},
            timestamp: "${new Date().toISOString()}",
            schema_name: ${model_name}Schema?.name,
        };

        this.connector          = this.datbase_manager.getRegistredDataSource(${model_name}Schema?.datasource_name);
        this.QueryBuilderClass  = QueryBuilderMapper(${model_name}Schema?.datasource_type, this.logger);
        this.query_builder      = new this.QueryBuilderClass(${model_name}Schema, [], this.logger);
        this.added_cols         = ${JSON.stringify(added_cols)};
        this.removed_cols       = ${JSON.stringify(removed_cols)};
        this.added_indx         = ${JSON.stringify(added_indx)};
        this.removed_indx       = ${JSON.stringify(removed_indx)};
        this.all_cols           = Object.keys(${model_name}Schema.columns);
        this.all_indexes        = ${model_name}Schema.indexes || [];
    }

    addNewColumns = async (new_col_names) => {
        for (const new_column_name of new_col_names) {
            const after_col_index               = this.all_cols.indexOf(new_column_name);
            const after_col                     = this.all_cols[after_col_index - 1] || null;
            const position_obj                  = { after: after_col };
            const col_def                       = ${model_name}Schema.columns[new_column_name];
            const { alter_sql, trigger_sqls }   = this.query_builder.addColumn(new_column_name, col_def, position_obj);

            await this.connector.executeQuery(alter_sql);

            for (const trigger_sql of trigger_sqls) {
                await this.connector.executeQuery(trigger_sql);
            }
        }
    }

    dropColumns = (col_names) => {
        for (const col_name of col_names) {
            const query = this.query_builder.dropColumn(col_name);
            await this.connector.executeQuery(query);
        }
    }

    addNewIndexes = (index_names) => {
        for (const index_name of index_names) {
            const index_obj = this.all_indexes.find(obj => obj?.name === index_name);

            if (!index_obj) { continue; }

            const query = this.query_builder.createIndex(index_obj?.fields, index_obj?.unique);
            await this.connector.executeQuery(query);
        }
    }

    dropIndexes = async (index_names) => {
        for (const index_name of index_names) {
            const query = this.query_builder.dropIndex(index_name);
            await this.connector.executeQuery(query);
        }
    }

    up = async () => {
        if (this.added_cols.length > 0) { await this.addNewColumns(this.added_cols); }

        if (this.removed_cols.length > 0) { await this.dropColumns(this.removed_cols); }

        if (this.added_indx.length > 0) { await this.addNewIndexes(this.added_indx); }

        if (this.removed_indx.length > 0) { await this.dropIndexes(this.removed_indx); }
    }

    down = async () => {
        if (this.added_cols.length > 0) { await this.dropColumns(this.added_cols); }

        if (this.removed_cols.length > 0) { await this.addNewColumns(this.removed_cols); }

        if (this.added_indx.length > 0) { await this.dropIndexes(this.added_indx); }

        if (this.removed_indx.length > 0) { await this.addNewIndexes(this.removed_indx); }
    }
}

module.exports = ${model_name}DeltaMigration;
    
`
}

const seederContent = (model_name, seeder_name = null, file_name = null, seed_data_sample = {}) => {
    const class_name     = seeder_name || `${model_name}Seeder`;
    const schema_name    = `${model_name}Schema`;
    const model_ref      = `${model_name}Model`;
    const log_file_name   = file_name || `${class_name}.js`;

    return `
const { QueryBuilderMapper }    = require("fiberx-dbms-orm");
const { ${schema_name} }         = require("../../schemas/app_schemas");

class ${class_name} {
    constructor(database_manager, logger = null) {
        this.database_manager   = database_manager;
        this.ENV                = database_manager?.ENV;
        this.helper             = database_manager?.helper;
        this.logger             = logger;
        this.connector          = this.database_manager.getRegistredDataSource(${schema_name}?.datasource_name);
        this.QueryBuilderClass  = QueryBuilderMapper(${schema_name}?.datasource_type, this.logger);
        this.query_builder      = new this.QueryBuilderClass(${schema_name}, [], this.logger);
        this.model              = this.database_manager?.${model_ref};
    }

    // Define seed data here
    getModelSeedData = () => {
        return [
            // Example seed data
            ${JSON.stringify(seed_data_sample, null, 4)}
        ];
    }

    up = async () => {
        try {
            const seeder_data   = this.getModelSeedData();
            const seeded        = await this.model.bulkCreate(seeder_data, { ignore_duplicates: true });

            if (!seeded || !seeded.length) {
                this.logger?.error("🚫 Error seeding the database.");
                throw new Error("Seeding failed.");
            }

            this.logger?.info(\`🌱 Seeded \${seeder_data.length} rows into model "${model_name}" from file "${log_file_name}"\`);
        } catch (error) {
            this.logger?.error("🚫 Error in up method", { error });
            throw error;
        }
    }

    down = async () => {
        try {
            const seeder_data   = this.getModelSeedData();
            const ids           = seeder_data.map(item => item?.id).filter(Boolean);

            if (!ids.length) {
                this.logger?.info("⚠️ No IDs found for rollback.");
                return;
            }

            const deleted = await this.model.destroy({ id: ids });

            this.logger?.info(\`🧹 Rolled back \${deleted} seeded rows from model "${this.model?.model}"\`);
        } catch (error) {
            this.logger?.error("🚫 Error in down method", { error });
            throw error;
        }
    }
}

module.exports = ${class_name};
`;
};


module.exports = {
    modelCodeContent,
    initialMigrationContent,
    deltaMigrationContent,
    seederContent
}






