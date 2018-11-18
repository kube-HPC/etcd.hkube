const uuidv4 = require('uuid/v4');

const setSchema = {
    type: 'object',
    properties: {
        serviceName: {
            type: 'string',
            default: ''
        },
        data: {
            default: {}
        },
        instanceId: {
            type: 'string'
        },
        suffix: {
            default: '',
            type: 'string'
        }
    }
};
const watchSchema = {
    type: 'object',
    properties: {
        serviceName: {
            type: 'string',
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
            type: 'string',
            default: null
        },
        prefix: {
            type: 'string',
            default: 'services'
        },
        instanceId: {
            type: 'string',
            default: ''
        },
        suffix: {
            default: '',
            type: 'string'
        }
    }
};
const initSchema = {
    type: 'object',
    properties: {
        host: {
            type: 'string'
        },
        port: {
            anyOf: [
                {
                    type: [
                        'integer',
                        'string'
                    ]
                }
            ]
        },
        protocol: {
            type: 'string',
            default: 'http'
        },
        serviceName: {
            type: 'string'
        },
        instanceId: {
            default: uuidv4(),
            type: 'string'
        },
        taskId: {
            type: 'string'
        },
        jobId: {
            type: 'string'
        }
    },
    required: [
        'host',
        'port',
        'serviceName'
    ]
};

module.exports = {
    getSchema,
    initSchema,
    watchSchema,
    setSchema
}; 
