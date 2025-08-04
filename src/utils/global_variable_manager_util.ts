

class GlobalVariableManagerUtil {
    private static instance: GlobalVariableManagerUtil;
    private variables: Map<string, any>;

    constructor() {
        this.variables = new Map<string, any>();
    }

    // Method to get the single instance of the GlobalVariableManagerUtil
    static getInstance(): GlobalVariableManagerUtil {
        if (!GlobalVariableManagerUtil.instance) {
            GlobalVariableManagerUtil.instance = new GlobalVariableManagerUtil();
        }

        return GlobalVariableManagerUtil.instance;
    }

    // Set a global variable, ensuring it's a constant once set
    setVariable(key: string, value: any): boolean {
        if (this.variables.has(key)) {
            console.error(`Variable ${key} is already set and cannot be changed.`);
            return false;
        }
        this.variables.set(key, value);
        return true;
    }

    // Get a global variable by key
    getVariable(key: string): any | null {
        if (!this.variables.has(key)) {
            console.error(`Variable ${key} not found.`);
            return null;
        }
        return this.variables.get(key) as any;
    }

    // Update a global variable if needed (but this method could be made more restrictive)
    updateVariable(key: string, value: any): boolean {
        if (!this.variables.has(key)) {
            console.error(`Variable ${key} does not exist.`);
            return false;
        }
        this.variables.set(key, value);
        return true;
    }

    // Optional: To list all the current global variables
    listVariables(): Map<string, any> {
        return this.variables;
    }
}

export default GlobalVariableManagerUtil;
