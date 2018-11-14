const registerSchema = {
    type: 'object',
    properties: {
        ttl: {
            type: 'integer',
            default: 10
        },
        data: {
            default: {},
            anyOf: [
                {
                    type: [
                        'string',
                        'object',
                        'null'
                    ]
                }
            ]
        },
        instanceId: {
            type: 'string'
        }
    }
};

const watchSchema = {
    type: 'object',
    properties: {
        serviceName: {
            anyOf: [
                {
                    type: [
                        'string',
                        'null'
                    ]
                }
            ],
            default: null
        },
        instanceId: {
            type: 'string',
            default: ''
        }
    }
};

const getSchema = {
    type: 'object',
    properties: {
        serviceName: {
            anyOf: [
                {
                    type: [
                        'string',
                        'null'
                    ]
                }
            ],
            default: null
        },
        instanceId: {
            type: 'string',
            default: ''
        }
    }
};

const setSchema = {
    type: 'object',
    properties: {
        serviceName: {
            type: 'string'
        },
        instanceId: {
            type: 'string'
        },
        data: {
            default: {}
        }
    },
    required: [
        'serviceName',
        'instanceId',
        'data'
    ]
};

module.exports = {
    registerSchema,
    watchSchema,
    getSchema,
    setSchema
}; 
