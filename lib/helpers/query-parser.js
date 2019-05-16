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
        this.querySchema = validator.compile(querySchema);
    }

    parse(option) {
        const options = option || {};
        this.querySchema(options);
        const { limit } = options;
        let { order, sort } = options;
        order = this._capitalize(order);
        sort = sorts[sort];
        if (!orders.includes(order)) {
            order = 'Create';
        }
        if (!Object.keys(sorts).includes(sort)) {
            sort = 'Ascend';
        }
        return { order, sort, limit };
    }

    _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = new QueryHelper();
