import fs       from "fs";
import path     from "path";
import crypto   from "crypto";

import { QueryCacheItemInterface, QueryCacheOptionsInterface } from "../types/util_type.js";

class QueryCacheManagerUtil {
    private static cache_data: Record<string, QueryCacheItemInterface> = {};
    private static cache_file_path: string;
    private static enabled: boolean = true;
    private static ttl_ms: number = 1000 * 60 * 60 * 6; // 6 hours default
    private static max_entries: number = 500;
    private static initialized: boolean = false;
    private static save_timer: NodeJS.Timeout | null = null;

    private static ensureInitialized(): void {
        if (!this.initialized) {
            this.initialize();
        }
    }

    // ✅ Load cache from file at startup
    private static loadCacheFromFile(): void {
        if (fs.existsSync(this.cache_file_path)) {
            try {
                const file_data = fs.readFileSync(this.cache_file_path, "utf-8");
                this.cache_data = JSON.parse(file_data) || {};
            } catch (error: unknown) {
                console.error("⚠️ QueryCacheManager: Failed to load cache file", { error });
                this.cache_data = {};
            }
        }
    }

    // ✅ Lazy save to disk (debounced)
    private static scheduleSave(): void {
        if (this.save_timer) { return; }

        this.save_timer = setTimeout(() => {
            try {
                fs.writeFileSync(this.cache_file_path, JSON.stringify(this.cache_data, null, 2), "utf-8");
            } 
            catch (error: unknown) {
                console.error("⚠️ QueryCacheManager: Failed to save cache file", { error });
            } 
            finally {
                this.save_timer = null;
            }
        }, 40000); // Save every 10 seconds at most
    }

    // ✅ Initialize cache system
    public static initialize(options: QueryCacheOptionsInterface = {}): void {
        if (this.initialized) { return; }

        this.enabled        = options.enabled ?? true;
        this.ttl_ms         = options.ttl_ms ?? this.ttl_ms;
        this.max_entries    = options.max_entries ?? this.max_entries;

        const cache_dir = path.join(process.cwd(), ".orm_cache");
        this.cache_file_path = path.join(cache_dir, "query_cache.json");

        if (!fs.existsSync(cache_dir)) {
            fs.mkdirSync(cache_dir, { recursive: true });
        }

        this.loadCacheFromFile();
        this.initialized = true;
    }

    // ✅ Generate a deterministic cache key
    public static generateCacheKey(model_name: string, method: string, input_params: Record<string, any>): string {
        const sorted_str    = JSON.stringify(input_params, Object.keys(input_params).sort());
        const hash          = crypto.createHash("sha256").update(sorted_str).digest("hex");

        return `${model_name}:${method}:${hash}`;
    }

    // ✅ Invalidate single entry
    public static invalidateKey(key: string): void {
        delete this.cache_data[key];
        this.scheduleSave();
    }

    // ✅ Invalidate all
    public static invalidateAll(): void {
        this.cache_data = {};
        this.scheduleSave();
    }

    // ✅ Cleanup least recently used or expired entries
    private static cleanup(): void {
        const now       = Date.now();
        const entries   = Object.entries(this.cache_data);
        const valid     = entries.filter(([_, item]) => now - item.created_at <= this.ttl_ms);

        if (valid.length > this.max_entries * 0.8) {
            valid.sort((a, b) => a[1].last_accessed - b[1].last_accessed);
            const trimmed = valid.slice(-this.max_entries);
            this.cache_data = Object.fromEntries(trimmed);
        } 
        else { this.cache_data = Object.fromEntries(valid); }

        this.scheduleSave();
    }

    // ✅ Get cached query if valid
    public static get<T = string | Record<string, string>>(key: string): T | undefined {
        this.ensureInitialized();
        
        if (!this.enabled) { return undefined; }

        const item = this.cache_data[key];

        if (!item) { return undefined; }

        const expired = (Date.now() - item.created_at) > this.ttl_ms;

        if (expired) {
            delete this.cache_data[key];
            return undefined;
        }

        item.last_accessed = Date.now();
        return (item.queries ?? item.query) as T;
    }

    // ✅ Store single query or structured queries (e.g. { data, count })
    public static set(key: string, query_data: string | Record<string, string>): void {
        if (!this.enabled) { return; }

        if (Object.keys(this.cache_data).length >= this.max_entries) { this.cleanup(); }

        const entry: QueryCacheItemInterface = {
            created_at: Date.now(),
            last_accessed: Date.now(),
        };

        if (typeof query_data === "string") { entry.query = query_data; }

        else { entry.queries = query_data; }

        this.cache_data[key] = entry;
        this.scheduleSave();
    }
}

export default QueryCacheManagerUtil;