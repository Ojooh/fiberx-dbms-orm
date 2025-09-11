
import fs from "fs";
import path from "path";
import { LogLevel, LogObject } from "../types/util_type";

// Logegr Util Class
class LoggerUtil {
    private module_name: string;
    private create_log_file: boolean;
    private log_file_path: string;

    constructor(module_name: string, create_log_file: boolean = false) {
        this.module_name        = module_name;
        this.create_log_file    = create_log_file;
        this.log_file_path      = this.getLogFilePath();
    }

    // Method to ensure output directory exist
    private ensureOutputDirExists(dir: string): string {
        if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }

        return dir;
    }

    // Method to get log file directy and path
    private getLogFilePath(): string {
        const base_dir          = process.cwd();
        const timestamp         = Math.floor(Date.now() / 1000);
        const log_dir           = this.ensureOutputDirExists(path.join(base_dir, "logs"));
        const file_name         = `${this.module_name}-${timestamp}.log`;
        const log_file_path     = path.join(log_dir, file_name);

        return log_file_path;
    }

    // Safely stringify objects while avoiding circular references
    private safeStringify(obj: any, space = 2): string {
        const seen = new WeakSet();
        return JSON.stringify(obj, function (_key, value) {

            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) { return "[Circular]"; }

                seen.add(value);
            }
            return value;
        }, space);
    }

    // Log a message with optional error data and level
    private log(message: string = "", data_error: any = {}, level: LogLevel = "INFO"): LogObject {
        const timestamp             = new Date().toISOString();
        const error_str             = data_error && Object.keys(data_error).length ? this.safeStringify(data_error, 0) : "";
        const log_msg               = `${timestamp} [${level}] ${message} ${error_str}\n`;
        const log_object: LogObject = { timestamp, status: level, message, data_error: data_error };

        if (this.create_log_file) { fs.appendFileSync(this.log_file_path, log_msg); }

        console.log(`\n${timestamp} [${level}] ${message}\n`);

        if (data_error && Object.keys(data_error).length) {
            console.log({ ...data_error });
            console.log("\n========================================\n");
        }

        return log_object;
    }

    // Log info-level messages
    info(message: string, data: any = {}): LogObject { return this.log(message, data, "INFO"); }

    // Log error-level messages
    error(message: string, error: any = {}): LogObject { return this.log(message, error, "ERROR"); }

    // Log alert-level messages
    alert(message: string, data: any = {}): LogObject { return this.log(message, data, "ALERT"); }

    // Log success-level messages
    success(message: string, data: any = {}): LogObject { return this.log(message, data, "SUCCESS"); }

    // Log how long a method took to execute
    logExecutionTime(start_time: [number, number], class_name: string, method_name: string): void {
        const [sec, nano] = process.hrtime(start_time);
        const duration_ms = (sec * 1000 + nano / 1e6).toFixed(2);
        this.info(`${class_name} - ${method_name} completed in ${duration_ms}ms`);
    }

}

export default LoggerUtil;