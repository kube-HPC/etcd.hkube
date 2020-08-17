const getSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        nodeName: {
            type: 'string'
        }
    },
    required: [
        'jobId',
        'nodeName'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        nodeName: {
            type: 'string'
        }
    },
    required: [
        'jobId',
        'nodeName'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        }
    },
    required: [
        'jobId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        jobId: {
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
