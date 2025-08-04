import { randomUUID } from "crypto";
import { v4 as uuidv4 } from "uuid";

export interface FileLike { name: string; }

class UUIDGeneratorUtil {

    // Method to Generate a standard UUID (Version 4) following RFC 4122.
    static generateUUIDV1(): string { return randomUUID(); }

    // Method to Generate a unique code based on the current timestamp and random characters.
    static generateUUIDV2(prefix: string = ""): string {
        const timestamp         = Date.now().toString();
        const time_stamp_part   = parseInt(timestamp, 10).toString(36);
        const random_part       = Math.random().toString(36).substring(2, 6);
        const unique_code     = `${prefix.toUpperCase()}-${time_stamp_part}${random_part}`.toLowerCase();
        return unique_code;
    }

	// Method to Generate a shorter unique code without hyphens: purely timestamp + random.
	static generateUUIDV3(): string {
		const timestamp 			= Date.now().toString();
		const time_stamp_part 		= parseInt(timestamp, 10).toString(36);
		const random_part 			= Math.random().toString(36).substring(2, 6);

		return `${time_stamp_part}${random_part}`.toUpperCase();
	}

	// Method to Generate a random byte string with optional prefix.
	static generateUUIDV4(prefix: string = ""): string { return `${prefix}_${uuidv4()}`; }

	// Method to Generate a new file name with a unique UUID
	static generateNewFileName(file: FileLike): string {
		const split = file.name.split(".");
		const ext = split[split.length - 1];
		const unique_name = this.generateUUIDV2("FILE");
		return `${unique_name}.${ext}`;
	}
}

export default UUIDGeneratorUtil
