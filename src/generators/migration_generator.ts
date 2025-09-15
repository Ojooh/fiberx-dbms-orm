import fs from 'fs';
import path from 'path';

import InputTransformerUtil     from "../utils/input_transformer_util";
import LoggerUtil               from "../utils/logger_util";

import { 
    initialMigrationCodeContent,
    updateMigrationCodeContent
} from "../templates/migration_template_util";

import { 
    SchemaSnapshotDifferenceInterface
} from "../types/model_type";

class MigrationGenerator {
    public output_dir: string;
    private logger: LoggerUtil;
    private readonly module_name = "migration_generator";

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
    public generateInitialMigrationContent(app_id: string, schema_name: string ): string {
        const class_name            = InputTransformerUtil.toPascalCase(schema_name);
        const class_snake_case      = InputTransformerUtil.toSnakeCase(schema_name)

        return initialMigrationCodeContent(app_id, class_name, class_snake_case);
    }

    // Generate model content as a string
    public generateUpdateMigrationContent(app_id: string, schema_name: string, migration_diff: SchemaSnapshotDifferenceInterface ): string {
        const class_name            = InputTransformerUtil.toPascalCase(schema_name);
        const class_snake_case      = InputTransformerUtil.toSnakeCase(schema_name)

        return updateMigrationCodeContent(app_id, class_name, class_snake_case, migration_diff);
    }

}

export default MigrationGenerator;


