const validator = require('../validation/validator');
const { querySchema } = require('./query-schema');

const orders = ['Key', 'Version', 'Create', 'Mod', 'Value'];
const sorts = {
    none: 'None',
    asc: 'Ascend',
    desc: 'Descend'
};

class QueryHelper {
    constructor() {
        this._schema = validator.compile(querySchema);
    }

    parse(option) {
        const options = option || {};
        validator.validate(this._schema, options);
        const { limit } = options;
        let { order, sort } = options;
        order = this._capitalize(order);
        sort = sorts[sort];
        if (!orders.includes(order)) {
            order = querySchema.properties.order.default;
        }
        if (!sort) {
            sort = querySchema.properties.sort.default;
        }
        return { order, sort, limit };
    }

    _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = new QueryHelper();
