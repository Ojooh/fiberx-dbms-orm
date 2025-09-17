
export function seederCodeContent(app_id: string, class_name: string, class_snake_case: string): string {
    return `

import { ${class_name}  } from "@/database_components/schemas/${class_snake_case.toLowerCase()}";
import BaseSeeder from "@/database_components/seeders/base/base_seeder";
import { SchemaDefinitionInterface } from "@/types/schema_type";

class ${class_name}Seeder extends BaseSeeder {
    constructor(schema: SchemaDefinitionInterface) {
        super("${class_snake_case.toLowerCase()}_seeder", ${class_name} );
    }

    // Override to provide seed data
    protected async getSeedData(): Promise<any[]> {
        return [];
    }
}

export default ${class_name}Seeder;
`;
}
