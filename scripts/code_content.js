
const modelCodeContent = (class_name) => {
    return`
const { SQLBaseModel: BaseModel }   = require("fiberx-dbms-orm");
const { ${class_name}Schema }       = require("../schemas/app_scheam");

class ${class_name}Model extends BaseModel {
        // Define your schema here
        static schema = ${class_name}Schema;

        #raw;

        constructor(data = {}) {
            super(data);
            this.#raw = data;
            this.addComputedAttributes();
        }

        // Method to get app computed attributes object
        getComputedAttributes = () => { return {}; };

        // Method to add computed attributes to the model
        addComputedAttributes = () => {
            const computed_attributes = this.getComputedAttributes();
            for (const [key, value] of Object.entries(computed_attributes)) {
                this[key] = value;
            }
        };
    }

    module.exports = ${class_name}Model;
    `;
} 

module.exports = {
    modelCodeContent
}

