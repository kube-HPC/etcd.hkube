const initSchema = {
    type: 'object',
    properties: {
        host: {
            type: 'string'
        },
        port: {
            type: 'integer'
        },
        protocol: {
            type: 'string',
            default: 'http'
        }
    },
    required: [
        'host',
        'port',
        'serviceName'
    ]
};

module.exports = {
    initSchema
};
