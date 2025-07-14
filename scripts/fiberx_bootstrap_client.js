// fiberx-bootstrap-client.js

const crypto        = require("crypto");
const axios         = require("axios");
const LoggerUtil    = require("../utils/logger_util");

class FiberXBootstrapClient {
    constructor({ app_id, api_key, dbms_url, logger = null }) {
        this.name      = "fiberx_bootstrap_client";
        this.app_id    = app_id;
        this.api_key   = api_key;
        this.dbms_url  = dbms_url.endsWith("/") ? dbms_url.slice(0, -1) : dbms_url;
        this.logger    = logger || new LoggerUtil(this.name);
    }

    // Generate HMAC signature
    generateSignature = (timestamp) => {
        const message = `${this.app_id}:${timestamp}`;
        return crypto.createHmac("sha256", this.api_key).update(message).digest("hex");
    }

    fetchBootstrapData = async () => {
        const timestamp = Math.floor(Date.now() / 1000); // seconds

        const signature = this.generateSignature(timestamp);

        const payload = { app_id: this.app_id, timestamp, signature };

        try {
            const response = await axios.post(`${this.dbms_url}/api/app-bootstrap`, payload);
            this.logger.success(`[${this.name}] Fetched app boostrap data successfully`)
            return response.data;
        } 
        catch (error) {
            this.logger .error(`[${this.name}] Error fetching bootstrap data:`, { error });
            throw error;
        }
    }
}

module.exports = FiberXBootstrapClient;
