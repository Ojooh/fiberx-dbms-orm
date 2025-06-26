const fs    = require('fs');
const path  = require('path');

const { modelCodeContent } = require("./code_content");
const LoggerUtil = require("../utils/logger_util");


class SQLModelGenerator {
    constructor(output_dir = './model/generated', logger = null) {
        this.name           = "sql_model_generator";
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

    // Generate model content as a string
    generateModelContent = (model_name) => {
        const class_name = this.toPascalCase(model_name);

        return modelCodeContent(class_name)
    }

    // Create model file
    createModelFilefromSchemas = (schemas) => {
        for (const schema of schemas) {
            const { model_name }        = schema;
            const snake_model_name      = this.toSnakeCase(model_name);
            const content               = this.generateModelContent(model_name);
            const file_path             = path.join(this.output_dir, `${snake_model_name}.js`);

            if (fs.existsSync(file_path)) {
                console.log(`❗ Model "${model_name}" already exists at: ${file_path}`);
                return;
            }

            fs.writeFileSync(file_path, content, 'utf8');
            this.logger.info(`[${this.name}] ✅ Model "${model_name}" generated at: ${file_path}`);
        }

        return true
    }
}

module.exports = SQLModelGenerator;
