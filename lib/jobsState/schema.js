const getSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        }
    }
};

const setSchema = {
    type: 'object',
    properties: {
        data: {
            default: {}
        },
        jobId: {
            type: 'string'
        }
    },
    required: [
        'jobId'
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

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema
};
