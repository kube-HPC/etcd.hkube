const getSchema = {
    type: 'object',
    properties: {
        id: {
            type: 'string'
        }
    },
    required: ['id']
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
        id: {
            type: 'string'
        }
    },
    required: ['id']
};

const watchSchema = {
    type: 'object',
    properties: {
        id: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        id: {
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
