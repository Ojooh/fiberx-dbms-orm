const fs            = require('fs');
const path          = require('path');

const LoggerUtil    = require("../utils/logger_util");
const {
    modelCodeContent,
    initialMigrationContent,
    deltaMigrationContent,
    seederContent
} = require("./code_content");

class CodeContentGenerator {
    constructor(output_dir = './generated', logger = null) {
        this.name = "code_file_generator";
        this.output_dir = output_dir;
        this.logger = logger || new LoggerUtil(this.name);

        this.#ensureOutputDir();
    }

    // Method to Convert snake_case or kebab-case to PascalCase
    toPascalCase = (name) => {
        return name.replace(/[_-]+/g, ' ').replace(/\s+(.)/g, (_, chr) => chr.toUpperCase()).replace(/^(.)/, (_, chr) => chr.toUpperCase());
    }

    // Method to Convert PascalCase or camelCase to snake_case
    toSnakeCase = (name) => {
        return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase();
    }

    // Method to Generate and write model files from schemas
    createModelFileFromSchemas = (schemas) => {
        for (const schema of schemas) {
            const { model_name, app_id } = schema;
            const snake_name = this.toSnakeCase(model_name);
            const content = modelCodeContent(app_id, this.toPascalCase(model_name));
            const file_path = path.join(this.output_dir, `${snake_name}.js`);

            if (fs.existsSync(file_path)) {
                this.logger.warn(`Model "${model_name}" already exists at: ${file_path}`);
                continue;
            }

            fs.writeFileSync(file_path, content, 'utf8');
            this.logger.info(`✅ Model "${model_name}" generated at: ${file_path}`);
        }

        return true;
    }

    // Generate model content as a string
    generateModelContent = (app_id, model_name) => {
        const class_name = this.toPascalCase(model_name);

        return modelCodeContent(app_id, class_name)
    }

    // Method to Generate initial migration content
    generateInitialMigrationContent = (app_id, model_name, column_names, index_names) => {
        const class_model_name = this.toPascalCase(model_name);
        return initialMigrationContent(app_id, class_model_name, column_names, index_names);
    }

    // Method to Generate delta migration content
    generateDeltaMigrationContent = (app_id, model_name, added_cols, added_indx, removed_cols, removed_indx) => {
        const class_model_name = this.toPascalCase(model_name);
        return deltaMigrationContent(app_id, class_model_name, added_cols, added_indx, removed_cols, removed_indx);
    }

    // Method to Generate seeder content
    generateSeederContent = (app_id, model_name, seeder_name = null, file_name = null, seed_data_sample = {}) => {
        const class_model_name      = this.toPascalCase(model_name);
        const pascal_seeder_name    = this.toPascalCase(seeder_name);
        const snake_seeder_name     = this.toSnakeCase(seeder_name)
        return seederContent(app_id, class_model_name, pascal_seeder_name, snake_seeder_name, file_name, seed_data_sample);
    }

    // Method to Ensure output directory exists
    #ensureOutputDir = () => {
        if (!fs.existsSync(this.output_dir)) {
            fs.mkdirSync(this.output_dir, { recursive: true });
        }
    }

}

module.exports = CodeContentGenerator