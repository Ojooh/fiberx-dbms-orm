
class InputTransformerUtil {

    public static toPascalCase (name: string): string {
        return name.replace(/[_-]+/g, ' ').replace(/\s+(.)/g, (_, chr) => chr.toUpperCase()).replace(/^(.)/, (_, chr) => chr.toUpperCase());
    }

    public static toSnakeCase(name: string): string {
        return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase();
    }

}

export default InputTransformerUtil;