import {
    SchemaSnapshotDifferenceInterface
} from "../types/model_type";

export function initialMigrationCodeContent(app_id: string, class_name: string, class_snake_case: string): string {

return `
import { ${class_name}Schema  } from "@/database_components/schemas/${class_snake_case.toLowerCase()}_schema";
import BaseInitialMigration from "@/database_components/migrations/base/base_initial_migration";

class ${class_name}InitialMigration extends BaseInitialMigration {
    constructor() {
        super("${class_snake_case.toLowerCase()}_initial_migration", ${class_name}Schema );
    }
}

export default ${class_name}InitialMigration;
`
}


export function updateMigrationCodeContent(app_id: string, class_name: string, class_snake_case: string, migration_diff: SchemaSnapshotDifferenceInterface): string {

return `
import { ${class_name}Schema  } from "@/database_components/schemas/${class_snake_case.toLowerCase()}_schema";
import BaseMigration from "@/database_components/migrations/base/base_update_migration";

class ${class_name}UpdateMigration extends BaseMigration {
    constructor() {
        super("${class_snake_case.toLowerCase()}_update_migration", ${class_name}Schema );
        this.migration_diff         = ${migration_diff};
    }
}

export default ${class_name}UpdateMigration;
`
}