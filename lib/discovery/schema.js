const uuidv4 = require('uuid/v4');

const initSchema = {
    type: 'object',
    properties: {
        serviceName: {
            type: 'string'
        },
        instanceId: {
            type: 'string',
            default: uuidv4()
        }
    },
    required: [
        'serviceName'
    ]
};

const registerSchema = {
    type: 'object',
    properties: {
        ttl: {
            type: 'integer',
            default: 10
        },
        data: {
            default: {}
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

const deleteSchema = {
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

module.exports = {
    initSchema,
    registerSchema,
    watchSchema,
    getSchema,
    setSchema,
    deleteSchema
};
