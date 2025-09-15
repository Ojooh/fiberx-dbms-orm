export function modelCodeContent(app_id: string, class_name: string, class_snake_case: string): string {
    return `
    
import { BaseSQLModel } from "fiberx-dbms-orm";
import { ${class_name}Schema } from "@/database_components/schemas/${class_snake_case.toLowerCase()}_schema";

class ${class_name}Model extends BaseSQLModel {
    static schema   = ${class_name}Schema;

    constructor(data: Record<string, any> = {}) {
        super(data);
        this.addComputedAttributes();
    }

    // Override this to define computed fields
    protected getComputedAttributes(): Record<string, any> {
        return {};
    }

    // Adds computed attributes to this instance
    protected addComputedAttributes(): void {
        const computed = this.getComputedAttributes();
        for (const [key, value] of Object.entries(computed)) {
            if (value !== undefined) { this[key] = value; }
        }
    }
}

export default ${class_name}Model;
`;
}

export function initialMigrationCodeContent(app_id: string, class_name: string, class_snake_case: string): string {
    return `
import { 
    DataSourceRegistry,
    BaseSQLConnector,
    SQLQueryBuilder
} from "fiberx-dbms-orm";
import { 
${class_name}Schema 
} from "@/database_components/schemas/${class_snake_case.toLowerCase()}_schema";

import LoggerUtil                       from "@/utils/logger_util";
import { SafeThrow }                    from "@/utils/safe_execute_util";
import { SchemaDefinitionInterface }    from "@/types/schema_type";

class ${class_name}InitialMigration {
    private readonly name = "${class_snake_case}_initial_migration";
    private readonly schema: SchemaDefinitionInterface;
    private logger: LoggerUtil;
    private datasource_registry: DataSourceRegistry;
    private datasource_connector: BaseSQLConnector;
    private query_builder: SQLQueryBuilder;

    constructor() {
        this.schema                  = ${class_name}Schema;
        this.logger                  = new LoggerUtil(this.name);
        this.datasource_registry     = DataSourceRegistry.getInstance();
        this.datasource_connector    = this.getDatasource();
        this.query_builder           = this.datasource_connector.query_builder;
    }

    // Method to get datasource connector
    @SafeThrow
    private getDatasource(): BaseSQLConnector {
        const connector_name = ${class_name}Schema.datasource_name || "";
        this.logger.info(\`🔌 Connecting to datasource: \${connector_name}\`);

        const datasource = this.datasource_registry.getConnector(connector_name);
        this.logger.success(\`✅ Connected to datasource: \${connector_name}\`);
        return datasource;
    }

    @SafeThrow
    public async up(): Promise<void> {
        const { table_name = "", indexes = [] } = this.schema;
        this.logger.info(\`🚀 [UP] Starting migration: creating table "\${table_name}"\`);

        const create_table_sql = this.query_builder.generateCreateTableQuery(this.schema);
        this.logger.info(\`📝 Generated SQL for table creation: \${create_table_sql}\`);

        // Execute the create table query here
        await this.datasource_connector.executeQuery(create_table_sql);
        this.logger.success(\`✅ Table "\${table_name}" created successfully.\`);

        if (indexes.length > 0) {
            this.logger.info(\`📦 Creating \${indexes.length} index(es) for "\${table_name}"...\`);
        }

        for (const index_obj of indexes) {
            const create_table_index_sql = this.query_builder.generateAddIndexQuery(index_obj, this.schema);
            this.logger.info(\`📝 Generated SQL for index creation: \${JSON.stringify(index_obj)} \${create_table_index_sql}\`);
            
            // Execute the index creation query here
            await this.datasource_connector.executeQuery(create_table_index_sql);
            this.logger.success(\`🔖 Index on [\${index_obj.fields.join(", ")}] created.\`);
        }

        this.logger.info(\`🎉 [UP] Migration completed for table "\${table_name}".\`);
    }

    @SafeThrow
    public async down(): Promise<void> {
        const { table_name = "", indexes = [] } = this.schema;
        this.logger.warn(\`⏬ [DOWN] Rolling back migration: dropping table "\${table_name}"\`);

        const drop_table_sql = this.query_builder.generateDropTableQuery(this.schema);
        this.logger.info(\`📝 Generated SQL for table drop: \${drop_table_sql}\`);

        // Execute the drop table query here
        await this.datasource_connector.executeQuery(drop_table_sql);
        this.logger.success(\`🗑️ Table "\${table_name}" dropped successfully.\`);

        if (indexes.length > 0) {
            this.logger.info(\`🧹 Removing \${indexes.length} index(es) for "\${table_name}"...\`);
        }

        for (const index_obj of indexes) {
            const remove_index_sql = this.query_builder.generateRemoveIndexQuery(index_obj, this.schema);
            this.logger.info(\`📝 Generated SQL for index removal: \${JSON.stringify(index_obj)} \${remove_index_sql}\`);
            
            // Execute the index removal query here
            await this.datasource_connector.executeQuery(remove_index_sql);
            this.logger.success(\`❌ Index on [\${index_obj.fields.join(", ")}] removed.\`);
        }

        this.logger.info(\`♻️ [DOWN] Rollback completed for table "\${table_name}".\`);
    }
}

export default ${class_name}InitialMigration;
`;
}


// export function modelCodeContent(app_id: string, class_name: string): string {
//     return `
    
// const { BaseSQLModel }      =  require("fiberx-dbms-orm");
// const { ${class_name}Schema } = require("../../schemas/${app_id.toLowerCase()}_schemas");

// class ${class_name}Model extends BaseSQLModel {
//     static schema   = ${class_name}Schema;

//     constructor(data) {
//         super(data);
//         this.addComputedAttributes();
//     }

//     // Override this to define computed fields
//     #getComputedAttributes() {
//         return {};
//     }

//     // Adds computed attributes to this instance
//     #addComputedAttributes() {
//         const computed = this.getComputedAttributes();
//         for (const [key, value] of Object.entries(computed)) {
//             if (value !== undefined) { this[key] = value; }
//         }
//     }
// }

// module.exports =  ${class_name}Model;
// `;
// }
