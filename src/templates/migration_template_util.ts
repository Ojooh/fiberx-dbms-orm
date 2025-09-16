import {
    SchemaSnapshotDifferenceInterface
} from "../types/model_type";

export function initialMigrationCodeContent(app_id: string, class_name: string, class_snake_case: string): string {

return `
import { ${class_name}  } from "@/database_components/schemas/${class_snake_case.toLowerCase()}";
import BaseInitialMigration from "@/database_components/migrations/base/base_initial_migration";

class ${class_name}InitialMigration extends BaseInitialMigration {
    constructor() {
        super("${class_snake_case.toLowerCase()}_initial_migration", ${class_name} );
    }
}

export default ${class_name}InitialMigration;
`
}


export function updateMigrationCodeContent(app_id: string, class_name: string, class_snake_case: string, migration_diff: SchemaSnapshotDifferenceInterface): string {

    const migration_diff_str = JSON.stringify(migration_diff, null, 2);
    
return `
import { ${class_name} } from "@/database_components/schemas/${class_snake_case.toLowerCase()}";
import BaseMigration from "@/database_components/migrations/base/base_update_migration";

class ${class_name}UpdateMigration extends BaseMigration {
    constructor() {
        super("${class_snake_case.toLowerCase()}_update_migration", ${class_name} );
        this.migration_diff         = ${migration_diff_str};
    }
}

export default ${class_name}UpdateMigration;
`
}