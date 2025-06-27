const fs    = require('fs');
const path  = require('path');

const { initialMigrationContent, deltaMigrationContent } = require("./code_content");
const LoggerUtil = require("../utils/logger_util");


class MigrationContentGenerator {
    constructor(output_dir = './database/migrations', logger = null) {
        this.name           = "migration_content_generator";
        this.output_dir     = output_dir;
        this.logger         = logger || new LoggerUtil()


        this.#ensureOutputDir();
    }

    // Method to Ensure the output directory exists
    #ensureOutputDir = () => {
        if (!fs.existsSync(this.output_dir)) { fs.mkdirSync(this.output_dir, { recursive: true }); }
    }

    // Convert model name to PascalCase (e.g., user_profile → UserProfile)
    toPascalCase = (name) => {
        return name.replace(/[_-]+/g, ' ').replace(/\s+(.)/g, (_, chr) => chr.toUpperCase()).replace(/^(.)/, (_, chr) => chr.toUpperCase());
    }

    toSnakeCase = (name) => {
        return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase();
    }

    // Generate migration content as a string
    generateInitialMigrationModelContent = (model_name, column_names, index_names) => {
        const class_model_name = this.toPascalCase(model_name);

        return initialMigrationContent(class_model_name, column_names, index_names)
    }

    // Generate migration content as a string
    generateDeltaMigrationModelContent = (model_name, added_cols, added_indx, removed_cols, removed_indx) => {
        const class_model_name = this.toPascalCase(model_name);

        return deltaMigrationContent(class_model_name, added_cols, added_indx, removed_cols, removed_indx);
    }
}

module.exports = MigrationContentGenerator;
