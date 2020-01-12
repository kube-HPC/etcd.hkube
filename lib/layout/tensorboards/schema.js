const getSchema = {
    type: 'object',
    properties: {
        logDir: {
            type: 'string'
        }
    },
    required: [
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        logDir: {
            type: 'string',
        },
        pipelineName: {
            type: 'string',
        },
        nodeName: {
            type: 'string',
        }
    },
    required: [
        'logDir', 'pipelineName', 'nodeName'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        logDir: {
            type: 'string'
        }
    },
    required: [
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        logDir: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        logDir: {
            type: 'string',
            default: ''
        }
    }
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema,
    listSchema
};
