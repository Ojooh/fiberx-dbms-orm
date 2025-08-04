import { 
  ConnectionParams, 
  QueryParams, 
  ExecuteQueryResult 
} from "../../types/connector_type";

import SQLQueryBuilder from "../../query_builders/base_sql_query_builder"; 

import BaseSQLAdmin from "../management/base_sql_admin";

interface BaseSQLConnector {

    query_builder: SQLQueryBuilder;

    sql_admin: BaseSQLAdmin

    connect(connectionParams: ConnectionParams): Promise<boolean>;

    disconnect(connectionId?: string): Promise<boolean>;

    beginTransaction(): Promise<string>;

    commitTransaction(transactionId: string): Promise<boolean>;

    rollbackTransaction(transactionId: string): Promise<boolean>;

    executeQuery(query: string, params?: QueryParams): Promise<ExecuteQueryResult>;
}

export default BaseSQLConnector;
