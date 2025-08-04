const AppSchemas = {
    "TestSchema": {
        "id": 17,
        "name": "TestSchema",
        "app_id": "fibase",
        "table_name": "fibase_tests",
        "model_name": "Test",
        "datasource_name": "Fibase-mysql-datasource-development",
        "datasource_type": "mysql",
        "primary_key": "id",
        "migration_priority": 1,
        "timestamps": 1,
        "permissions": [
            "read",
            "create",
            "update",
            "delete"
        ],
        "columns": {
            "id": {
                "type": {
                    "name": "BIGINT"
                },
                "auto_increment": true,
                "unique": true,
                "primary_key": true
            },
            "name": {
                "type": {
                    "name": "STRING",
                    "length": 255
                },
                "nullable": false
            },
            "created_at": {
                "type": {
                    "name": "DATE"
                },
                "default": "CURRENT_TIMESTAMP"
            },
            "updated_at": {
                "type": {
                    "name": "DATE"
                },
                "nullable": true,
                "default": null,
                "on_update": "CURRENT_TIMESTAMP"
            }
        },
        "indexes": [
            {
                "name": "idx_fibase_tests_created_at",
                "fields": [
                    "created_at"
                ],
                "unique": false
            },
            {
                "name": "idx_fibase_tests_name",
                "fields": [
                    "name"
                ],
                "unique": false
            },
            {
                "name": "idx_fibase_tests_updated_at",
                "fields": [
                    "updated_at"
                ],
                "unique": false
            }
        ],
        "status": "PENDING"
    }
};

export default AppSchemas