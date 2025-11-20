class SQLRawUtil {
    private expression: string;

    constructor(expr: string) {
        this.expression = expr.trim();
    }

    public getExpression(): string {
        return this.expression;
    }

    public static RAW(expr: string): SQLRawUtil {
        return new SQLRawUtil(expr);
    }

    public validateRawExpression(): { v_state: boolean; v_msg: string } {

        const cleaned = this.getExpression().trim();

        // Must contain AS
        if (!/\sAS\s+\w+/i.test(cleaned)) {
            return { v_state: false, v_msg: `invalid_raw_expression_missing_alias` };
        }

        // Basic safety checks:
        if (/;|--|\/*|\*\//.test(cleaned)) {
            return { v_state: false, v_msg: `invalid_raw_expression_unsafe_characters` };
        }

        // Disallow multiple SQL statements:
        if ((cleaned.match(/AS/gi) || []).length > 1) {
            return { v_state: false, v_msg: `invalid_raw_expression_multiple_aliases_detected` };
        }

        return { v_state: true, v_msg: "valid_raw_expression" };
    }
}

export default SQLRawUtil;
