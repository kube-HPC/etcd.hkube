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
        },
        clientOptions: {
            type: 'object',
            default: {}
        },
        timeout: {
            type: ['number'],
            default: 60000
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
