const moment    = require("moment");

class InputValidationUtil {
        private static readonly optional_field_regex       = /^[a-zA-Z0-9_\-]+$/; 
		private static readonly name_regex_reg_exp         = /^[A-Za-z.'\s/_-]*$/;
		private static readonly namey_regex_reg_exp        = /^[A-Za-z0-9.'\s,/_\-()&]*$/;
		private static readonly email_regex_reg_exp        = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i;
		private static readonly tel_regex_reg_exp          = /^[\s()+-]*([0-9][\s()+-]*){6,20}$/;
		private static readonly pass_regex_reg_exp         = /^(?=.*[a-z])(?=.*\d).{6,}$/;
		private static readonly url_regex_reg_exp          = /^(https?:\/\/)?((localhost|[a-zA-Z0-9-_.]+)(:[0-9]{1,5})?)(\/[a-zA-Z0-9-._~:/?#@!$&'()*+,;=%]*)?$/;
		private static readonly text_area_regex_reg_exp   = /^(?=.*[a-zA-Z])[\w\s.,!?'\-()&@$#%*+=:;"<>]*$/;
		private static readonly uuid_regex_reg_exp         = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		private static readonly custom_uuid_regex_reg_exp  = /^[A-Z0-9]{12}-[A-Z0-9]{12}-[A-Z0-9]{12}-[A-Z0-9]{12}$/;

        static isLowerSnakeCase(str: string): boolean { return /^[a-z]+(_[a-z]+)*$/.test(str); }

        static isUpperPascalCase(str: string): boolean { return /^[A-Z][a-zA-Z]*$/.test(str); }

        static isEmpty(input: any): boolean { return !input || input.toString().trim() === ""; }

        static isValidOptionalField(str: string): boolean { return this.optional_field_regex.test(str); }

        static isValidName(name: string): boolean { return this.name_regex_reg_exp.test(name); }

        static isValidNamey(name: string): boolean { return this.namey_regex_reg_exp.test(name); }

        static isValidEmail(email: string): boolean { return this.email_regex_reg_exp.test(email) && email.length <= 254; }

        static isValidPhoneNumber(tel: string): boolean { return this.tel_regex_reg_exp.test(tel); }

        static isValidPassword(password: string): boolean { return this.pass_regex_reg_exp.test(password); }

        static isDigit(input: any): boolean { return !isNaN(input); }

        static isValidInteger(input: any): boolean { return Number.isInteger(input) && input > 0; }

        static isValidFloat(input: any): boolean { return !isNaN(input) && parseFloat(input) > 0; }

        static isValidURLY(url: string): boolean {
            try { 
                new URL(url);
                return true;
            } 
            catch (_) { return false; }
        }

        static isValidURL(url: string): boolean { return this.url_regex_reg_exp.test(url) && this.isValidURLY(url); }

        static isBoolean(value: any): boolean { return typeof value === "boolean" || ["1", "0"].includes(String(value)); }

        static isValidLongText(text: string): boolean { return this.text_area_regex_reg_exp.test(text); }

        static isValidUUID(uuid: string): boolean { return this.uuid_regex_reg_exp.test(uuid); }
        
        static isValidCustomUUID(uuid: string): boolean { return this.custom_uuid_regex_reg_exp.test(uuid); }
        
        static isArrayUnique(arr: any[]): boolean { return new Set(arr).size === arr.length; }
        
        static isValidFutureDate(date_string: string): boolean {
            const date = moment(date_string.toString(), moment.ISO_8601, true);
            return date.isValid() && date.isAfter(moment());
        }

        static isTruthyString(value: any): boolean { return String(value).toLowerCase() === "true" || String(value) === "1"; }
        
        static hasInputChanged( new_input: Record<string, any>, existing_data: Record<string, any>, keys_to_check: string[] ): boolean {
            const normalize = (val: any): any => {
                if (typeof val === "boolean") return val;
                if (val === 1 || val === "1") return true;
                if (val === 0 || val === "0") return false;
                return val;
            };

            for (const key of keys_to_check) {
                const a = normalize(new_input[key]);
                const b = normalize(existing_data[key]);

                if (typeof a === "object" || typeof b === "object") {
                    if (JSON.stringify(a) !== JSON.stringify(b)) { return true; }
                } 
                else if (a !== b) { return true; }
            }

            return false;
        }
}

export default InputValidationUtil;
