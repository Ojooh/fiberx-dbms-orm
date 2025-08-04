import crypto from "crypto";
import axios from "axios";
import type { AxiosResponse } from "axios";
import LoggerUtil from "../utils/logger_util";

import {
    BootstrapClientConfig,
    BootstrapResponse,
    ConnectionInfo
} from "../types/script_type";

class FiberXBootstrapClient {
    private app_id: string;
    private api_key: string;
    private dbms_url: string;
    private logger: LoggerUtil;
    private readonly module_name = "fiberx_bootstrap_client";

    constructor({ app_id, api_key, dbms_url, logger }: BootstrapClientConfig) {
        this.app_id     = app_id;
        this.api_key    = api_key;
        this.dbms_url   = dbms_url.endsWith("/") ? dbms_url.slice(0, -1) : dbms_url;
        this.logger     = logger || new LoggerUtil(this.module_name);
    }

    // Method to generate request signature
    private generateSignature(timestamp: number): string {
        const message   = `${this.app_id}:${timestamp}`;
        return crypto.createHmac("sha256", this.api_key).update(message).digest("hex");
    }

    // Method to Normalize connection_info fields into a single connection_info object
    private normalizeConnectionInfo(data: BootstrapResponse): BootstrapResponse {
        const datasources = data.datasources.map((ds) => {
            const { wait_for_connection, connection_limit, queue_limit, connection_info = {}, ...rest } = ds;

            const normalized_connection_info: ConnectionInfo = { ...connection_info };

            return { ...rest, connection_info: normalized_connection_info };
        });

        return { datasources, schemas: data.schemas };
    }

    // Method to fetch fiberx app bootstrapped data
    public async fetchBootstrapData(): Promise<BootstrapResponse> {
        try {
            const timestamp     = Math.floor(Date.now() / 1000);
            const signature     = this.generateSignature(timestamp);
            const payload       = { app_id: this.app_id, timestamp, signature };

            const response: AxiosResponse<BootstrapResponse> = await axios.post(`${this.dbms_url}/api/app-schema-access/app-bootstrap`, payload);

            this.logger.success(`[${this.module_name}] Fetched app bootstrap data successfully`);
            return this.normalizeConnectionInfo(response.data);
        }
        catch (error) {
            this.logger.error(`[${this.module_name}] Error fetching bootstrap data`, { error });
            throw error;
        }
    }
}

export default FiberXBootstrapClient;