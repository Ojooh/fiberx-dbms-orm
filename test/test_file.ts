import BaseSQLModel from "../src/models/base_sql_model"; // Adjust path
import { SchemaDefinitionInterface } from "../src/types/model_type";

class TestModel extends BaseSQLModel {
    static schema: SchemaDefinitionInterface = {
        id: 17,
        name: "TestSchema",
        app_id: "fibase",
        table_name: "fibase_tests",
        model_name: "Test",
        datasource_name: "Fibase-mysql-datasource-development",
        datasource_type: "mysql",
        primary_key: "id",
        migration_priority: 1,
        timestamps: 1,
        permissions: ["read", "create", "update", "delete"],
        columns: {
        id: {
            type: { name: "BIGINT" },
            auto_increment: true,
            unique: true,
            primary_key: true
        },
        name: {
            type: { name: "STRING", length: 255 },
            nullable: false
        },
        created_at: {
            type: { name: "DATE" },
            default: "CURRENT_TIMESTAMP"
        },
        updated_at: {
            type: { name: "DATE" },
            nullable: true,
            default: null,
            on_update: "CURRENT_TIMESTAMP"
        }
        },
        indexes: [],
        status: "PENDING"
    };
}

export default TestModel;


(async () => {
  const testInstance = await TestModel.findOne({ where: { id: { ">=": 1}}, options: { limit: 2, offset: 2, order_by: "name", order_direction: "DESC"} });
  console.log(testInstance);
})();
