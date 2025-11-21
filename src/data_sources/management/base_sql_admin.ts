import { SchemaDefinitionInterface } from "../../types/model_type";
import {
    CreateDatabaseParams,
    CreateDatabaseUserParams,
    GrantDatabaseUserPriviledgeParams
} from "../../types/query_builder_type";

interface BaseSQLAdmin {
    createNewDatabase(input_params: CreateDatabaseParams): Promise<boolean>;
    deleteDatabase(input_params: CreateDatabaseParams): Promise<boolean>;
    
    createNewUser(input_params: CreateDatabaseUserParams): Promise<boolean>;
    deleteUser(input_params: CreateDatabaseUserParams): Promise<boolean>;

    createTableInDatabase(schema: SchemaDefinitionInterface): Promise<boolean>;

    grantUserPriviledges(input_params: GrantDatabaseUserPriviledgeParams): Promise<boolean>;
    revokeUserPriviledges(input_params: GrantDatabaseUserPriviledgeParams): Promise<boolean>;
}

export default BaseSQLAdmin;
