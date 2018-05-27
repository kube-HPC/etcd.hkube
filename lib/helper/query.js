const djsv = require('djsv');
const { querySchema } = require('./query-schema');

const orders = ['Key', 'Version', 'Create', 'Mod', 'Value'];
const sorts = ['None', 'Ascend', 'Descend'];

const sortTable = {
    asc: 'Ascend',
    desc: 'Descend'
};

class QueryHelper {
    constructor() {
        this.querySchema = djsv(querySchema);
    }

    parse(options) {
        const schema = this.querySchema(options);
        let { order, sort, limit } = schema.instance;
        order = this._capitalize(order);
        sort = sortTable[sort];
        if (!orders.includes(order)) {
            order = 'Create';
        }
        if (!sorts.includes(sort)) {
            sort = 'Ascend';
        }
        return { order, sort, limit };
    }

    _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = new QueryHelper();
