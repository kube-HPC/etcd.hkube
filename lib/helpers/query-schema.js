
const querySchema = {
    type: 'object',
    properties: {
        order: {
            type: 'string',
            default: 'Mod'
        },
        sort: {
            type: 'string',
            default: 'Descend'
        },
        limit: {
            type: 'integer',
            minimum: 1,
            maximum: 1000000,
            default: 100
        }
    }
};

module.exports = {
    querySchema
};
