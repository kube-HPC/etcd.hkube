const Validate = require('ajv');

const validator = new Validate({ useDefaults: true, coerceTypes: true });

class Validator {
    compile(schema) {
        return validator.compile(schema);
    }

    validate(schema, object) {
        const obj = object || {};
        const valid = schema(obj);
        if (!valid) {
            throw new Error(validator.errorsText(validator.errors));
        }
        return true;
    }
}

module.exports = new Validator();
