export function modelCodeContent(app_id: string, class_name: string): string {
    return `
    
import { BaseSQLModel } from "fiberx-dbms-orm";
import { ${class_name}Schema } from "../../schemas/${app_id.toLowerCase()}_schemas";

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

export default ${class_name};
`;
}
