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
            default: 1000
        },
        keysOnly: {
            type: 'boolean',
            default: false
        }
    }
};

module.exports = {
    querySchema
};
