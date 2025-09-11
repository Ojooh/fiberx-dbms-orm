import fs from 'fs';
import path from 'path';

import InputTransformerUtil from "../utils/input_transformer_util";
import { modelCodeContent } from "../templates/model_template_util";
import LoggerUtil from "../utils/logger_util";

const SUPPORTED_SQL_DIALECTS = ["mysql", "postgres", "sqlite"];

import { SchemaDefinition } from "../types/model_type";

class ModelGenerator {
    public output_dir: string;
    private logger: LoggerUtil;
    private readonly module_name = "fiberx_bootstrap_client";

    constructor(output_dir: string, logger?: LoggerUtil) {
        this.output_dir     = output_dir;
        this.logger         = logger || new LoggerUtil(this.module_name);
    }

    private isSQLDialect(dialect: string | undefined): boolean {
        return SUPPORTED_SQL_DIALECTS.includes((dialect || "").toLowerCase());
    }

    // Generate model content as a string
    public generateModelContent(app_id: string, model_name: string): string {
        const class_name = InputTransformerUtil.toPascalCase(model_name);
        return modelCodeContent(app_id, class_name);
    }

    // Method to generate and write model files from schemas
    public createModelFileFromSchemas(schemas: SchemaDefinition[]): boolean {
        for (const schema of schemas) {
            const { model_name, app_id = "app_models", datasource_type } = schema;

            if (!this.isSQLDialect(datasource_type)) {
                this.logger.info(`[${this.module_name}] Skipping non-SQL model "${model_name}"`);
                continue;
            }

            const snake_name    = InputTransformerUtil.toSnakeCase(model_name || "");
            const file_path     = path.join(this.output_dir, app_id, `${snake_name}.js`);
            const content       = this.generateModelContent(app_id || "", model_name || "");

            if (fs.existsSync(file_path)) {
                this.logger.info(`[${this.module_name}]  ⚠️ Model "${model_name}" already exists at: ${file_path}`);
                continue;
            }

            fs.writeFileSync(file_path, content, 'utf8');
            this.logger.success(`[${this.module_name}]  ✅ Model "${model_name}" generated at: ${file_path}`);
        }

        return true;
    }

}

export default ModelGenerator;


