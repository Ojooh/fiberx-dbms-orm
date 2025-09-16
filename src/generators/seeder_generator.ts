import fs from 'fs';
import path from 'path';

import InputTransformerUtil     from "../utils/input_transformer_util";
import LoggerUtil               from "../utils/logger_util";

import { 
    seederCodeContent
} from "../templates/seeder_template_util";


class SeederGenerator {
    public output_dir: string;
    private logger: LoggerUtil;
    private readonly module_name = "seeder_generator";

    constructor(output_dir: string, logger?: LoggerUtil) {
        this.output_dir     = output_dir;
        this.logger         = logger || new LoggerUtil(this.module_name, true);
    }

    // Method to Ensure a directory exists. If it doesn't, creates it.
    private ensureDirExists(directory_path: string): string {
        const resolved_path = path.resolve(directory_path);

        if (!fs.existsSync(resolved_path)) {
            fs.mkdirSync(resolved_path, { recursive: true });
        }

        return resolved_path;
    }


    // Generate initial migration content as a string
    public generateSeederContent(app_id: string, schema_name: string ): string {
        const class_name            = InputTransformerUtil.toPascalCase(schema_name);
        const class_snake_case      = InputTransformerUtil.toSnakeCase(schema_name)

        return seederCodeContent(app_id, class_name, class_snake_case);
    }

    // Method to generate and write migration files from schemas
    public createSeederFileFromSchema(
        file_name: string, 
        app_id: string, 
        schema_name: string, 
    ): boolean {

        const file_path     = path.join(this.output_dir, file_name);
        const content       = this.generateSeederContent(app_id, schema_name)

        if (fs.existsSync(file_path)) {
            this.logger.info(`[${this.module_name}]  ⚠️ Seeder "${file_name}" already exists at: ${file_path}`);
            return false;
        }

        fs.writeFileSync(file_path, content, 'utf8');
        this.logger.success(`[${this.module_name}]  ✅ Seeder "${file_name}" generated at: ${file_path}`);

        return true;
    }

}

export default SeederGenerator;


